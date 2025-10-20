export const setToken = (token: string) => {
    localStorage.setItem("jwt_token", token);
};

export const getToken = () => localStorage.getItem("jwt_token");

export const clearToken = () => {
    localStorage.removeItem("jwt_token");
};

export const isAuthenticated = (): boolean => {
    const token = getToken();
    if (!token) {
        console.log('No access token found');
        return false;
    }

    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            console.warn('Invalid JWT token format');
            clearToken();
            return false;
        }

        const payload = JSON.parse(atob(parts[1]));
        const isExpired = payload.exp * 1000 <= Date.now();

        if (isExpired) {
            console.warn('Access token has expired');
            clearToken();
            return false;
        }

        return true;
    } catch (error) {
        console.error('Failed to parse JWT token:', error);
        clearToken();
        return false;
    }
};