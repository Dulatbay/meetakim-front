import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import * as React from "react";

export const PhoneInputPage = () => {
    const navigate = useNavigate();
    const [rawPhone, setRawPhone] = useState("");
    const [loading, setLoading] = useState(false);

    const formatPhoneDisplay = (value: string) => {
        if (!value) return "+7";
        const digits = value.replace(/\D/g, "");
        let formatted = "+7";

        if (digits.length > 1) formatted += ` (${digits.substring(1, 4)}`;
        if (digits.length >= 4) formatted += `) ${digits.substring(4, 7)}`;
        if (digits.length >= 7) formatted += `-${digits.substring(7, 9)}`;
        if (digits.length >= 9) formatted += `-${digits.substring(9, 11)}`;
        return formatted;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value.replace(/\D/g, "");
        const value = input.startsWith("7") ? input : "7" + input;
        setRawPhone(value.substring(0, 11));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (rawPhone.length !== 11) {
            toast.error("Введите корректный номер телефона");
            return;
        }

        const phoneForBackend = rawPhone.replace(/\D/g, "");

        setLoading(true);
        try {
            localStorage.setItem("phoneNumber", phoneForBackend);
            navigate("/login");
        } catch (e) {
            console.error(e);
            toast.error("Произошла ошибка");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white rounded-xl p-6 md:p-8 max-w-lg w-full shadow-xl">
                <div className="text-center mb-6">
                    <h1 className="text-2xl sm:text-3xl text-gray-800 font-semibold mb-2">
                        Встреча с акимом
                    </h1>
                    <p className="text-gray-600 text-base sm:text-lg">Онлайн очередь</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                            Номер телефона
                        </label>
                        <input
                            id="phone"
                            type="tel"
                            inputMode="numeric"
                            value={formatPhoneDisplay(rawPhone)}
                            onChange={handlePhoneChange}
                            placeholder="+7 (XXX) XXX-XX-XX"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                            disabled={loading}
                            required
                        />
                        <p className="mt-2 text-xs text-gray-500">
                            Введите номер в формате: +7 (XXX) XXX-XX-XX
                        </p>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-base font-medium transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                        disabled={loading || rawPhone.length < 11}
                    >
                        {loading ? "Загрузка..." : "Продолжить"}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-200">
                    <p className="text-gray-500 text-sm">
                        После ввода номера телефона вы перейдете к авторизации через eGov Mobile
                    </p>
                </div>
            </div>
        </div>
    );
};
