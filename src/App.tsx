import {CallbackPage} from "./pages/CallbackPage.tsx";
import {LoginPage} from "./pages/LoginPage.tsx";
import {RequireAuth} from "./components/RequireAuth.tsx";
import {QueuePage} from "./pages/QueuePage.tsx";
import {AdminPage} from "./pages/AdminPage.tsx";
import {Toaster} from "sonner";
import {Navigate, Route, Routes} from "react-router-dom";

const App = () => {
    return (
        <>
            <Routes>
                <Route path="/login" element={<LoginPage/>}/>
                <Route path="/auth/callback" element={<CallbackPage/>}/>

                <Route
                    path="/queue"
                    element={
                            <QueuePage/>
                    }
                />

                <Route
                    path="/admin"
                    element={
                        <RequireAuth>
                            <AdminPage/>
                        </RequireAuth>
                    }
                />

                <Route path="/" element={<Navigate to="/login"/>}/>
            </Routes>

            <Toaster richColors position="top-right"/>
        </>
    )
};

export default App;
