import winston from 'winston';
import { Log } from '../models';
import { Writable } from 'stream';

// Transport personalizado para guardar logs en MongoDB
class MongoTransport extends winston.Transport {
  constructor(opts: any) {
    super(opts);
  }

  log(info: any, callback: () => void) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // Guardar en MongoDB de forma asíncrona
    this.saveToMongo(info)
      .then(() => callback())
      .catch((error) => {
        // No hacer console.error aquí para evitar loops infinitos
        callback();
      });
  }

  private async saveToMongo(info: any) {
    try {
      const logEntry = new Log({
        timestamp: new Date(info.timestamp),
        level: info.level,
        message: info.message,
        category: info.category || 'SYSTEM',
        action: info.action || 'UNKNOWN',
        userId: info.userId,
        metadata: {
          ...info,
          // Remover campos que ya están en el esquema principal
          timestamp: undefined,
          level: undefined,
          message: undefined,
          category: undefined,
          action: undefined,
          userId: undefined,
          service: undefined,
          version: undefined
        },
        service: info.service || 'chat-platform',
        version: info.version || '1.0.0'
      });

      await logEntry.save();
    } catch (error) {
      // No hacer console.error aquí para evitar loops infinitos
      // Solo fallar silenciosamente
    }
  }
}

export default MongoTransport;
