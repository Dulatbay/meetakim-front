import {useEffect} from "react";
import {setToken} from "../utils/tokenUtils.ts";
import {useNavigate} from "react-router-dom";

export const CallbackPage = () => {
    const navigate = useNavigate();
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token");

        if (token) {
            setToken(token);
            navigate("/queue?sessionId" + (localStorage.getItem("sessionId") ?? ""));

            window.close();
        } else {
            window.close();
        }
    }, [navigate]);

    return <div>Завершаем авторизацию...</div>;
};
