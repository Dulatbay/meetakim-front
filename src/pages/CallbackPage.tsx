import {useEffect} from "react";
import {setToken} from "../utils/tokenUtils.ts";

export const CallbackPage = () => {
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token");

        if (token) {
            setToken(token);

            window.close();
        } else {
            window.close();
        }
    }, []);

    return <div>Завершаем авторизацию...</div>;
};
