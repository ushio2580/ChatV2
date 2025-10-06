# rl_cleaner_mvp.py  ——  versión depurada final
"""
Agente DQN para limpiar zonas contaminadas:
* Entorno sintético o imagen satelital.
* DQN con replay, red objetivo, Huber loss.
* Guardado automático de pesos y CSV de recompensas.
* detecta CPU vs GPU y muestra al inicio.
* CLI tolerante en Jupyter (parse_known_args).

Uso:
    python rl_cleaner_mvp.py                 # sintético, 500 ep
    python rl_cleaner_mvp.py --episodes 800  # más episodios
    python rl_cleaner_mvp.py --sat mapa.jpg --episodes 1000
    python rl_cleaner_mvp.py --demo

Requisitos satélite:
    pip install pillow opencv-python
"""
from __future__ import annotations
import argparse, collections, csv, random, time
from pathlib import Path
from typing import Tuple

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
import gymnasium as gym
from gymnasium import spaces
import matplotlib.pyplot as plt
from matplotlib import colors

# dependencias opcionales
try:
    import cv2  # type: ignore
    from PIL import Image  # type: ignore
except ImportError:
    cv2 = None
    Image = None

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"🚀 Ejecutando en dispositivo: {DEVICE}")

# --------------------------------------------------
# Utils imágenes satelitales
# --------------------------------------------------
def load_image(path: Path, size: int = 64) -> np.ndarray:
    if Image is None:
        raise ImportError("Instala pillow para imágenes satelitales.")
    img = Image.open(path).convert("RGB")
    img = img.resize((size, size), Image.BILINEAR)
    return np.array(img)

def contamination_mask(rgb: np.ndarray) -> np.ndarray:
    """Heurística HSV para manchas marrón-rojizas."""
    if cv2 is None:
        raise ImportError("Instala opencv-python para detectar contaminación.")
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    lower1, upper1 = np.array([0, 70, 40]), np.array([20, 255, 255])
    lower2, upper2 = np.array([160, 70, 40]), np.array([180, 255, 255])
    mask = cv2.inRange(hsv, lower1, upper1) | cv2.inRange(hsv, lower2, upper2)
    return (mask > 0).astype(np.uint8)

# --------------------------------------------------
# Entornos
# --------------------------------------------------
class BaseEnv(gym.Env):
    metadata = {"render_modes": ["human"], "render_fps": 6}
    CLEAN_R, STEP_COST, BORDER_PEN = 5.0, -0.001, -0.05

    def __init__(self, grid: np.ndarray):
        super().__init__()
        self.grid0 = grid.astype(np.uint8)
        self.N = grid.shape[0]
        self.action_space = spaces.Discrete(5)
        self.observation_space = spaces.Box(0, 1, shape=grid.shape, dtype=np.uint8)
        self.reset()

    def reset(self, *, seed: int|None = None, options=None) -> Tuple[np.ndarray, dict]:
        super().reset(seed=seed)
        self.grid = self.grid0.copy()
        self.pos = [self.N // 2, self.N // 2]
        self.steps = 0
        return self.grid.copy(), {}

    def step(self, a: int) -> Tuple[np.ndarray,float,bool,bool,dict]:
        r = self.STEP_COST
        if a == 4 and self.grid[tuple(self.pos)] == 1:
            self.grid[tuple(self.pos)] = 0
            r = self.CLEAN_R
        else:
            dx, dy = {0:(-1,0),1:(1,0),2:(0,-1),3:(0,1)}.get(a,(0,0))
            nr = min(max(self.pos[0] + dx, 0), self.N - 1)
            nc = min(max(self.pos[1] + dy, 0), self.N - 1)
            if [nr, nc] == self.pos:
                r += self.BORDER_PEN
            self.pos = [nr, nc]
        self.steps += 1
        done = self.steps >= 400 or np.count_nonzero(self.grid) == 0
        return self.grid.copy(), r, done, False, {}

    def _vis(self) -> np.ndarray:
        img = self.grid.copy()
        img[tuple(self.pos)] = 2
        return img

    def render(self) -> None:
        cmap = colors.ListedColormap(["white", "brown", "blue"])
        norm = colors.BoundaryNorm([0, 0.5, 1.5, 2.5], cmap.N)
        plt.imshow(self._vis(), cmap=cmap, norm=norm)
        plt.axis("off"); plt.pause(0.1); plt.clf()

class SyntheticEnv(BaseEnv):
    def __init__(self, size: int = 6, dirt: int = 6):
        grid = np.zeros((size, size), np.uint8)
        for i,j in random.sample([(x,y) for x in range(size) for y in range(size)], dirt):
            grid[i,j] = 1
        super().__init__(grid)

class SatelliteEnv(BaseEnv):
    def __init__(self, img_path: Path, size: int = 64):
        rgb = load_image(img_path, size)
        mask = contamination_mask(rgb)
        self.rgb = rgb
        super().__init__(mask)
    def _vis(self) -> np.ndarray:
        vis = self.rgb.copy()
        vis[self.grid == 1] = [150, 50, 50]
        r,c = self.pos; vis[r,c] = [0,0,255]
        return vis

# --------------------------------------------------
# DQN + Replay
# --------------------------------------------------
class DQN(nn.Module):
    def __init__(self, inp: int, n_actions: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Flatten(), nn.Linear(inp,256), nn.ReLU(),
            nn.Linear(256,128), nn.ReLU(), nn.Linear(128,n_actions)
        )
    def forward(self, x): return self.net(x.float())

class ReplayBuf:
    def __init__(self, cap: int = 40_000): self.buf = collections.deque(maxlen=cap)
    def push(self, *data): self.buf.append(data)
    def sample(self, bs: int):
        s,a,r,s2,d = zip(*random.sample(self.buf, bs))
        return (torch.tensor(s,device=DEVICE), torch.tensor(a,device=DEVICE),
                torch.tensor(r,device=DEVICE), torch.tensor(s2,device=DEVICE), torch.tensor(d,device=DEVICE))
    def __len__(self): return len(self.buf)

# --------------------------------------------------
# Entrenamiento & Demo
# --------------------------------------------------
def train(env: gym.Env, episodes: int, demo: bool, weight_path: Path, log_csv: Path) -> DQN:
    inp = int(np.prod(env.observation_space.shape)); n_act = env.action_space.n
    policy = DQN(inp, n_act).to(DEVICE); target = DQN(inp, n_act).to(DEVICE)
    if weight_path.exists(): policy.load_state_dict(torch.load(weight_path, map_location=DEVICE)); print(f"⚡ Pesos cargados: {weight_path}")
    target.load_state_dict(policy.state_dict()); target.eval()
    rb = ReplayBuf(); opt = optim.Adam(policy.parameters(), lr=1e-4); loss_fn = nn.SmoothL1Loss()
    eps = 0.05 if demo else 1.0; gamma, decay, sync, steps = 0.99, 0.997, 750, 0
    # init CSV
    if not log_csv.exists(): log_csv.write_text("episode,reward\n")
    for ep in range(1, episodes+1):
        obs,_ = env.reset(); state = obs.reshape(-1); total_r, done = 0.0, False
        while not done:
            if random.random() < eps: a = random.randrange(n_act)
            else: a = int(torch.argmax(policy(torch.tensor(state,device=DEVICE).unsqueeze(0))))
            obs2, r, done, _, _ = env.step(a); next_state = obs2.reshape(-1)
            if not demo: rb.push(state,a,r,next_state,done)
            state, total_r, steps = next_state, total_r+r, steps+1
            if not demo and len(rb) >= 64:
                sb,ab,rb_r,sb2,db = rb.sample(64)
                q = policy(sb.float()).gather(1,ab.unsqueeze(1)).squeeze(1)
                with torch.no_grad(): y = rb_r + gamma * target(sb2.float()).max(1)[0] * (1 - db.float())
                loss = loss_fn(q, y); opt.zero_grad(); loss.backward(); opt.step()
            if steps % sync == 0: target.load_state_dict(policy.state_dict())
        # log
        log_csv.write_text(f"{ep},{total_r:.2f}\n", append=False)
        if not demo:
            eps = max(eps*decay, 0.05)
            if ep % 50 == 0: print(f"Ep {ep}: reward={total_r:.2f}, ε={eps:.2f}, buf={len(rb)}")
    if not demo: torch.save(policy.state_dict(), weight_path); print(f"📦 Pesos guardados en {weight_path}")
    return policy

# --------------------------------------------------
# CLI
# --------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser()
    args, _ = parser.parse_known_args()
    parser.add_argument("--sat", type=str, help="Ruta imagen satelital")
    parser.add_argument("--episodes", type=int, default=500)
    parser.add_argument("--demo", action="store_true")
    parser.add_argument("--size", type=int, default=64)
    ns = parser.parse_args()
    # elegir entorno
    if ns.sat:
        env = SatelliteEnv(Path(ns.sat), size=ns.size)
        weight = Path(f"dqn_{Path(ns.sat).stem}.pt")
    else:
        env = SyntheticEnv()
        weight = Path("dqn_synthetic.pt")
    log_csv = Path("training_log.csv")
    # entrenamiento/demo
    agent = train(env, ns.episodes, ns.demo, weight, log_csv)
    # demo final
    plt.ion()
    obs,_ = env.reset(); st = obs.reshape(-1); done = False
    while not done:
        act = int(torch.argmax(agent(torch.tensor(st,device=DEVICE).unsqueeze(0))))
        obs,_,done,_,_ = env.step(act); env.render(); st = obs.reshape(-1)
    plt.ioff(); plt.show()

if __name__ == "__main__": main()
