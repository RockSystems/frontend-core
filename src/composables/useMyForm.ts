import {toTypedSchema} from "@vee-validate/zod";
import {FormOptions, useForm} from 'vee-validate';
import {computed} from 'vue';
import {z} from 'zod';
import {FormHelper, PathInto} from "../helpers/form.helper";
import {useModalDirtyGuard} from "../plugins/modals.plugin";

interface IExtendValidation<T extends z.ZodTypeAny> {
    (schema: T, fNames: PathInto<T>): z.ZodTypeAny;
}

export type UseMyFormConfig<T extends z.ZodTypeAny> = {
    extendValidation?: IExtendValidation<T>,
} & FormOptions<z.infer<T>>

export function useMyForm<T extends z.ZodTypeAny>(schema: T, config: UseMyFormConfig<T>) {
    const {extendValidation, ...formOptions} = config;
    const fNames: PathInto<T> = FormHelper.names<T>();

    // Имена полей формы списком. Нужны разбору ошибок бэка: он присылает пути
    // СВОИХ полей запроса (`payment_date`), а форма зовёт их по-своему
    // (`month`), и без этого списка ошибка молча уезжала в несуществующее поле.
    // Плоский уровень — вложенных схем в проекте нет (см. ApiErrorHelper).
    const fieldPaths: string[] = schema instanceof z.ZodObject
        ? Object.keys(schema.shape as Record<string, unknown>)
        : [];

    const formContext = useForm({
        ...formOptions,
        validationSchema: toTypedSchema(
            extendValidation ? extendValidation(schema, fNames) : schema
        ),
    });

    const {meta, isSubmitting} = formContext;
    // «Форма зайнята» = йде сабміт, а НЕ «невалідна» і не «перевіряється».
    // handleSubmit піднімає isSubmitting ще до колбека і сам чекає валідацію.
    // meta.pending сюди не беремо: поле перевіряється на blur, тобто саме тоді,
    // коли натискають «Зберегти». Кнопка на мить ставала disabled між mousedown
    // і mouseup, і браузер ковтав клік — форма не відправлялась з першого разу.
    const isBusy = computed(() => isSubmitting.value)

    // Набране, але не збережене: закриття модалки спершу перепитає. Після
    // успіху модалку закриває resolve(), повз цю перевірку.
    useModalDirtyGuard(() => meta.value.dirty);

    return {
        ...formContext,
        fNames,
        fieldPaths,
        isBusy,
    };
}
