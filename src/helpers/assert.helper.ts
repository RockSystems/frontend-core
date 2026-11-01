// Exhaustive-перевірка дискримінованих юніонів (switch без «сліпого» default).
//
// Ставимо у гілку `default`: поки всі варіанти юніону розібрані, аргумент
// звужується до `never` і код компілюється. Додали новий варіант у юніон, а
// case забули — аргумент уже НЕ `never`, і tsc падає САМЕ тут, назвавши
// пропущений варіант. Рантайм-throw — страховка (мертвий код, поки типи цілі).
//
// Приклад:
//   switch (x.type) {
//     case 'a': return …
//     case 'b': return …
//     default: return AssertHelper.never(x.type)
//   }
export class AssertHelper {
  static never(value: never): never {
    throw new Error(`Unhandled variant: ${JSON.stringify(value)}`)
  }
}
