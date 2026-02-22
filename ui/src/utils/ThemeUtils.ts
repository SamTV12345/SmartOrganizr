export type AppTheme = "light" | "dark";

const THEME_COOKIE_NAME = "smartorganizr_theme";
const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const parseThemeCookie = (): AppTheme | null => {
    if (typeof document === "undefined") return null;

    const cookieEntry = document.cookie
        .split("; ")
        .find((entry) => entry.startsWith(`${THEME_COOKIE_NAME}=`));

    if (!cookieEntry) return null;
    const value = cookieEntry.split("=")[1];
    if (value === "light" || value === "dark") return value;
    return null;
};

export const setThemeCookie = (theme: AppTheme) => {
    if (typeof document === "undefined") return;
    document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=${THEME_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
};

export const applyTheme = (theme: AppTheme) => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
};

export const getInitialTheme = (): AppTheme => {
    const cookieTheme = parseThemeCookie();
    if (cookieTheme) return cookieTheme;
    return "light";
};

export const setTheme = (theme: AppTheme) => {
    applyTheme(theme);
    setThemeCookie(theme);
};
