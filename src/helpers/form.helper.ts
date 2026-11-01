import z from "zod";

type CombinePath<P extends string, K extends string> = P extends ""
    ? K
    : `${P}.${K}`;

type PathNode<T, P extends string> = (() => P) & (
    T extends (infer R)[]
        ? { readonly [K in number]: PathNode<R, `${P}[${number}]`> }
        : T extends object
            ? { readonly [K in keyof T & string]: PathNode<T[K], CombinePath<P, K>> }
            : unknown
    );

export type PathInto<T extends z.ZodTypeAny> = T extends z.ZodObject<infer Shape>
    ? { readonly [K in keyof Shape & string]: PathNode<z.infer<Shape[K]>, K> }
    : z.infer<T> extends object
        ? PathNode<z.infer<T>, "">
        : never;

export class FormHelper {
    /**
     * Возвращает объект-прокси, который динамически строит путь к полю.
     * Поддерживает вложенность и массивы через TS-магию.
     */
    static names<T extends z.ZodTypeAny>(): PathInto<T> {
        const createProxy = (path: string[] = []): any => {
            const currentPath = path.filter(Boolean).join('.').replace(/\.\[/g, '[');

            // Цель — функция, возвращающая накопленный путь
            const fn = () => currentPath;

            return new Proxy(fn, {
                // Когда вызываем fNames.field()
                apply: () => currentPath,

                // Когда идем глубже fNames.field.sub
                get(_, prop: string) {
                    // Если это не строка (напр. Symbol), возвращаем как есть
                    if (typeof prop !== 'string') return Reflect.get(fn, prop);

                    const nextPath = [...path];
                    const isIndex = !isNaN(Number(prop));

                    if (isIndex && nextPath.length > 0) {
                        // Индекс массива: приклеиваем [0] к последнему элементу
                        nextPath[nextPath.length - 1] += `[${prop}]`;
                    } else {
                        // Обычное поле
                        nextPath.push(prop);
                    }

                    return createProxy(nextPath);
                }
            });
        };

        return createProxy();
    }

    static createSchema<T>() {
        return <S extends { [K in keyof T]: z.ZodType<T[K]> }>(shape: S) => {
            return z.object(shape) as unknown as z.ZodType<T, z.ZodTypeDef, T> & { shape: S };
        };
    }
}
