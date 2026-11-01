export type DeepPartial<T> = T extends (...args: any[]) => any
    ? T
    : T extends Array<infer InferredArrayMember>
        ? Array<DeepPartial<InferredArrayMember>>
        : T extends object
            ? { [K in keyof T]?: DeepPartial<T[K]> }
            : T;

export type MyFunction = (...args: any[]) => any;
