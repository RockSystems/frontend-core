export class EnumHelper {
    static getMap<T extends object>(ENUM: T): { [K in Extract<keyof T, string>]: K } {
        const keys = Object.keys(ENUM).filter(k => isNaN(Number(k)));
        return Object.fromEntries(keys.map(k => [k, k])) as any;
    }
}
