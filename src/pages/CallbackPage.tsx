import {useEffect} from "react";
import {setToken} from "../utils/tokenUtils.ts";
import {useNavigate} from "react-router-dom";

export const CallbackPage = () => {
    const navigate = useNavigate();
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token");
        const sessionId = localStorage.getItem("sessionId");

        if (token && sessionId) {
            setToken(token);
            navigate(`/queue?sessionId=${sessionId}`);
        } else if (sessionId) {
            navigate(`/queue?sessionId=${sessionId}`);
        } else {
            navigate('/login');
        }
    }, [navigate]);

    return <div>Завершаем авторизацию...</div>;
};
