import {LoginPage} from "./pages/LoginPage.tsx";
import {AdminLoginPage} from "./pages/AdminLoginPage.tsx";
import {PhoneInputPage} from "./pages/PhoneInputPage.tsx";
import {RequireAuth} from "./components/RequireAuth.tsx";
import {QueuePage} from "./pages/QueuePage.tsx";
import {AdminPage} from "./pages/AdminPage.tsx";
import {CompletedPage} from "./pages/CompletedPage.tsx";
import {Toaster} from "sonner";
import {Route, Routes} from "react-router-dom";

const App = () => {
    return (
        <>
            <Routes>
                <Route path="/" element={<PhoneInputPage/>}/>
                <Route path="/login" element={<LoginPage/>}/>
                <Route path="/admin/login" element={<AdminLoginPage/>}/>

                <Route
                    path="/queue"
                    element={
                        <QueuePage/>
                    }
                />

                <Route
                    path="/completed"
                    element={<CompletedPage/>}
                />

                <Route
                    path="/admin"
                    element={
                        <RequireAuth>
                            <AdminPage/>
                        </RequireAuth>
                    }
                />
            </Routes>

            <Toaster richColors position="top-right"/>
        </>
    )
};

export default App;
