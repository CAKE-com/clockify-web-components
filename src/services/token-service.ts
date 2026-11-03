class TokenService {
    private static token: string = "";

    static getToken(): string | null {
        return this.token;
    }

    static setToken(token: string): string {
        if(token){
            this.token = token;
            return token;
        }
        return "";
    }

    static setTokenToStorage(token: string): string {
        return this.setToken(token);
    }
}

export default TokenService;