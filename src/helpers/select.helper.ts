import {SelectItem} from "../types/ui/select";

export class SelectHelper {
    static enum2list<V extends string>(ENUM: Record<string, V>, labels: Partial<Record<V, string>>): SelectItem<string>[] {
        return Object.values(ENUM)
            .filter((val): val is V => val in labels)
            .map((val) => {
                return {
                    id: val,
                    value: val,
                    title: labels[val] as string // Мы уверены, что title есть благодаря фильтру
                }
            });
    }
}
