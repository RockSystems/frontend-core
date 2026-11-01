import {VNodeProps, AllowedComponentProps, ComponentCustomProps} from "vue";

// vue props ---------------------------------------
type VueInternalProps = keyof VNodeProps | keyof AllowedComponentProps | keyof ComponentCustomProps;
export type ExtractComponentPublicProps<T> = T extends new (...args: any) => { $props: infer P }
    ? { [K in keyof P as K extends VueInternalProps ? never : K]: P[K] }
    : T extends (props: infer P, ...args: any) => any
        ? P
        : never;

// modals ------------------------------------------
export type ModalResult<T> = { my__res?: T | null };
export type ExtractModalResult<T> =
    T extends { my__res?: infer R | null } ? R :
        T extends { new (...args: any[]): { my__res?: infer R | null } } ? R :
            T extends { setup?: (...args: any[]) => { my__res?: infer R | null } } ? R :
                any;
// export type ExtractModalResult<T extends ModalResult<any>> = T extends ModalResult<infer R> ? R : never;
