import { IDbLogger } from '../interfaces/db-logger';

export class DefaultLogger implements IDbLogger {
    private static levels = ['verbose', 'debug', 'trace', 'info', 'warn', 'error', 'fatal'];
    private levelValue = DefaultLogger.levels[3];
    public set level(level: string) {
        if (DefaultLogger.levels.indexOf(level) < 0) {
            throw new Error('level \'' + level + '\' is not a valid log level');
        }
    }

    private isLogLevelActivated(target: string) {
        return DefaultLogger.levels.indexOf(this.levelValue) <= DefaultLogger.levels.indexOf(target);
    }

    public log(...args: any[]): void {
        if (this.isLogLevelActivated('verbose')) {
            console.log(...args);
        }
    }

    public trace(...args: any[]): void {
        if (this.isLogLevelActivated('trace')) {
            console.log(...args);
        }
    }

    public debug(...args: any[]): void {
        if (this.isLogLevelActivated('debug')) {
            console.log(...args);
        }
    }

    public info(...args: any[]): void {
        if (this.isLogLevelActivated('info')) {
            console.info(...args);
        }
    }

    public warn(...args: any[]): void {
        if (this.isLogLevelActivated('warn')) {
            console.warn(...args);
        }
    }

    public error(...args: any[]): void {
        if (this.isLogLevelActivated('error')) {
            console.error(...args);
        }
    }

    public fatal(...args: any[]): void {
        if (this.isLogLevelActivated('fatal')) {
            console.error(...args);
        }
    }
}
