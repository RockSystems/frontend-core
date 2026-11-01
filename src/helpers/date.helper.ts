import dayjs, { Dayjs } from 'dayjs'

// number = миллисекунды эпохи (как new Date(n) / dayjs(n)). Секунды Unix сюда
// не годятся — для них DateTimeCell с source='unix'.
type DateInput = Dayjs | Date | string | number | null | undefined;

export class DateHelper {
  static readonly DEFAULT_DATE_FORMAT = 'YYYY-MM-DD';

    static readonly DISPLAY_DATE_FORMAT = 'DD.MM.YYYY';
    static readonly DISPLAY_DATE_TIME_FORMAT = 'DD.MM.YYYY HH:mm';

    /**
     * Дата для отображения: "23.01.2026".
     */
    static format(val?: DateInput, placeholder = '—'): string {
        return DateHelper.display(val, this.DISPLAY_DATE_FORMAT, placeholder);
    }

    /**
     * Дата + время для отображения: "23.01.2026 14:30".
     */
    static formatDateTime(val?: DateInput, placeholder = '—'): string {
        return DateHelper.display(val, this.DISPLAY_DATE_TIME_FORMAT, placeholder);
    }

    /** Битая дата даёт placeholder, а не "Invalid Date" в интерфейсе. */
    private static display(val: DateInput, format: string, placeholder: string): string {
        if (!val) return placeholder;
        const parsed = dayjs(val);
        return parsed.isValid() ? parsed.format(format) : placeholder;
    }

    /**
     * Скільки календарних днів минуло від дати до сьогодні: у день дати — 0,
     * наступного дня — 1, незалежно від години. Порожня чи бита дата — null.
     */
    static daysSince(val: DateInput): number | null {
        if (!val) return null;
        const parsed = dayjs(val);
        return parsed.isValid() ? dayjs().startOf('day').diff(parsed.startOf('day'), 'day') : null;
    }

    /**
     * Преобразует дату в строку формата YYYY-MM-DD
     * для HTML-инпутов (type="date") или для форм, отправки на сервер.
     * Использует локальное время пользователя.
     *
     * @param date - Дата для преобразования.
     * @returns Строка "2026-01-23".
     */
    static toJSONDate(date: DateInput): string {
      if (!date) return '';
      return dayjs(date).format(this.DEFAULT_DATE_FORMAT);
    }

    /** Рядок — справжня дата "2026-01-23" (як дає <input type="date">), а не "2026-02-31". */
    static isJSONDate(value: string): boolean {
      return /^\d{4}-\d{2}-\d{2}$/.test(value) && dayjs(value).format(this.DEFAULT_DATE_FORMAT) === value;
    }
}
