import RequestService from "./request-service";
import { parseJwt } from "../utils";
import TokenService from "./token-service";

const GLOBAL_ENDPOINT = 'https://api.clockify.me';

class EndpointService {
    private static endpoint: string = "";
    private static homeUrl: string = "https://app.clockify.me";
    private static webBootEndpoint: string = "";

    static getHomeUrl(): string {
        return this.homeUrl;
    }

    static async getEndpoint() {
        if(!this.endpoint || this.endpoint === GLOBAL_ENDPOINT + "/api") {
            const token = TokenService.getToken() || "";
            return await this.setEndpointToStorage(token, "");
        }
        return this.endpoint;
    }

    static async setHomeUrlFromComponentToStorage(homeUrl: string) {
        if (homeUrl) {
            this.homeUrl = homeUrl;
            return;
        }
        this.homeUrl = 'https://app.clockify.me';
    }

    static async setEndpointToStorage(token: string, customEndpoint: string) {
        let stateOrWebBootEndpoint = '';
        const parsedToken = parseJwt(token);
        const backendUrl = parsedToken?.backendUrl || parsedToken?.baseURL;
        const homeUrl = EndpointService.getHomeUrl();
        if(!!homeUrl) {
            if(this.webBootEndpoint) {
                stateOrWebBootEndpoint = this.webBootEndpoint;
            } else {
                try {
                    const { endpoint } = await RequestService.get(`${homeUrl}/web/boot`);
                    this.webBootEndpoint = endpoint;
                    stateOrWebBootEndpoint = endpoint;
                } catch (e) {
                    // ignore
                }
            }
        } else {
            stateOrWebBootEndpoint = this.endpoint;
        }
        let endpointToStore: string =  customEndpoint || backendUrl || stateOrWebBootEndpoint || GLOBAL_ENDPOINT;
        if (endpointToStore.endsWith("/")) {
            endpointToStore = endpointToStore.slice(0, -1);
        }
        if(!endpointToStore.endsWith("/api")) {
            endpointToStore += '/api';
        }
        if(endpointToStore === "/api"){
            endpointToStore = homeUrl + endpointToStore;
        }
        if (endpointToStore.includes("app.clockify.me")) {
            endpointToStore = endpointToStore.replace("app.clockify.me", "api.clockify.me");
        }
        this.endpoint = endpointToStore;
        return endpointToStore;
    }
}

export default EndpointService;