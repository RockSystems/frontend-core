// Контракт смуги періодів. Домену тут немає: доріжки збирає фіча (корекції,
// машини), а компонент лише малює те, що дали.

export type TimelineTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent'

export interface TimelineItem {
  id: string
  /** Короткий підпис усередині смужки: номер авто, грейд тощо. */
  label: string
  from: string
  /** null — період триває: смужка тягнеться до «сьогодні». */
  to: string | null
  tone: TimelineTone
  /** Тултип — весь текст про період одним рядком. */
  title: string
}

export interface TimelineLane {
  id: string
  label: string
  items: TimelineItem[]
}
