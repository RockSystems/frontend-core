export class FileHelper {
    static formatSize(bytes: number, decimals = 1): string {
        if (!Number.isFinite(bytes) || bytes < 0) return '-';
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    /**
     * Чи підходить файл під атрибут `accept`: розширення (`.xlsx`), група
     * (`image/*`) чи точний тип (`application/pdf`). Без `accept` — будь-який.
     */
    static isAccepted(file: File, accept?: string): boolean {
        const tokens = (accept ?? '').split(',').map(token => token.trim().toLowerCase()).filter(Boolean);
        if (!tokens.length) return true;

        const name = file.name.toLowerCase();
        const type = file.type.toLowerCase();

        return tokens.some(token => {
            if (token.startsWith('.')) return name.endsWith(token);
            if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1));
            return type === token;
        });
    }
}
