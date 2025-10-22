export const makeSessionId = (): string => {
    // Генерируем случайное число в диапазоне int64
    // Используем timestamp + случайное число для уникальности
    const timestamp = Date.now(); // миллисекунды с 1970 года
    const random = Math.floor(Math.random() * 1000000); // случайное число до 1 млн
    return `${timestamp}${random}`;
};
