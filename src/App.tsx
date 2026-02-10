import {LoginPage} from "./pages/LoginPage.tsx";
import {AdminLoginPage} from "./pages/AdminLoginPage.tsx";
import {AkimLoginPage} from "./pages/AkimLoginPage.tsx";
import {PhoneInputPage} from "./pages/PhoneInputPage.tsx";
import {RequireAdminAuth} from "./components/RequireAdminAuth.tsx";
import {RequireAkimAuth} from "./components/RequireAkimAuth.tsx";
import {AdminPage} from "./pages/AdminPage.tsx";
import {AkimPage} from "./pages/AkimPage.tsx";
import {Toaster} from "sonner";
import {Route, Routes} from "react-router-dom";

const App = () => {
    return (
        <>
            <Routes>
                {/* Главная страница - ввод телефона */}
                <Route path="/" element={<PhoneInputPage/>}/>
                
                {/* Авторизация граждан через eGov Mobile */}
                <Route path="/login" element={<LoginPage/>}/>
                
                {/* Панель администратора */}
                <Route path="/admin/login" element={<AdminLoginPage/>}/>
                <Route
                    path="/admin"
                    element={
                        <RequireAdminAuth>
                            <AdminPage/>
                        </RequireAdminAuth>
                    }
                />
                
                {/* Панель акима */}
                <Route path="/akim/login" element={<AkimLoginPage/>}/>
                <Route
                    path="/akim"
                    element={
                        <RequireAkimAuth>
                            <AkimPage/>
                        </RequireAkimAuth>
                    }
                />
            </Routes>

            <Toaster richColors position="top-right"/>
        </>
    )
};

export default App;
