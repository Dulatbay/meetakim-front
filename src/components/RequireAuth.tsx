import type {FC, ReactNode} from "react";
import {Navigate, Outlet} from "react-router-dom";
import {isAdminAuthenticated} from "../utils/tokenUtils.ts";

export const RequireAuth: FC<{ children?: ReactNode }> = ({children}) => {
    if (!isAdminAuthenticated()) {
        return <Navigate to="/admin/login" replace/>;
    }

    return (
        <>
            {children}
            <Outlet />
        </>
    );
};