import { type ApiProblem } from "./apiProblem";

export enum ServerErrors {
    BadRequest = 400,
    Unauthorized = 401,
    Forbidden = 403,
    NotFound = 404,
    Conflict = 409,
    UnprocessableEntity = 422,
    InternalServerError = 500,
}

/**
 * Помилка запиту. Збирає її ОДИН перехоплювач axios (`_shared/api/index.ts`) —
 * методам api ловити нічого. Підпис дає словник за кодом із `problem`.
 */
export class AppError extends Error {
    /**
     * Розібране тіло помилки: код, `meta`, помилки полів. `null` — відповідь не
     * наша (проксі, обрив). Підпис користувачу за цим кодом дає словник у
     * `shared/errors` — сюди він не тягнеться: цей шар кроспроєктний і про мову
     * з доменом не знає.
     */
    problem: ApiProblem | null = null;

    /**
     * Відповіді не дочекались за лімітом (`REQUEST_TIMEOUT_MS`). Статус тоді 0,
     * як і в обриву мережі, але порада інша і повторювати не можна: сервер,
     * найпевніше, ще рахує попередній запит.
     */
    isTimeout = false;

    constructor(public status: ServerErrors | number, msg: string) {
        super(msg);
        this.name = this.constructor.name;
    }
}
