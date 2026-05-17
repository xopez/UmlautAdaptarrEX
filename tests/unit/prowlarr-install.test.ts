import {afterEach, beforeEach, describe, expect, it} from "vitest";
import type {Dispatcher} from "undici";
import {getGlobalDispatcher, MockAgent, setGlobalDispatcher} from "undici";
import {installUmlautProxy} from "@/arr/prowlarr";

const PROWLARR_HOST = "http://prowlarr:9696";
const API_KEY = "test-api-key-1234";

describe("installUmlautProxy", () => {
    let mockAgent: MockAgent;
    let originalDispatcher: Dispatcher;

    beforeEach(() => {
        originalDispatcher = getGlobalDispatcher();
        mockAgent = new MockAgent();
        mockAgent.disableNetConnect();
        setGlobalDispatcher(mockAgent);
    });

    afterEach(async () => {
        await mockAgent.close();
        setGlobalDispatcher(originalDispatcher);
    });

    function httpSchemaResponse() {
        return [
            {
                name: "Http",
                implementation: "Http",
                implementationName: "Http",
                configContract: "HttpProxySettings",
                fields: [
                    {name: "host", type: "textbox", value: ""},
                    {name: "port", type: "number", value: 8080},
                    {name: "username", type: "textbox", value: ""},
                    {name: "password", type: "password", value: ""},
                    {name: "requestTimeout", type: "number", value: 100},
                ],
                onHealthIssue: "None",
                includeHealthWarnings: false,
            },
        ];
    }

    it("creates tag and proxy when neither exists", async () => {
        const pool = mockAgent.get(PROWLARR_HOST);

        let postedTagBody: unknown;
        let postedProxyBody: unknown;

        pool.intercept({path: "/api/v1/tag", method: "GET"}).reply(200, []);
        pool
            .intercept({path: "/api/v1/tag", method: "POST"})
            .reply(201, (opts) => {
                postedTagBody = JSON.parse(String(opts.body));
                return {id: 42, label: "umlautadaptarrex"};
            });
        pool
            .intercept({path: "/api/v1/indexerproxy/schema", method: "GET"})
            .reply(200, httpSchemaResponse());
        pool
            .intercept({path: "/api/v1/indexerproxy", method: "GET"})
            .reply(200, []);
        pool
            .intercept({path: "/api/v1/indexerproxy", method: "POST"})
            .reply(201, (opts) => {
                postedProxyBody = JSON.parse(String(opts.body));
                return {id: 7, name: "UmlautAdaptarrEX"};
            });

        const result = await installUmlautProxy({
            prowlarrHost: PROWLARR_HOST,
            prowlarrApiKey: API_KEY,
            host: "192.168.1.5",
            port: 5006,
            username: "UmlautAdaptarr",
            password: "supersecret",
        });

        expect(result).toEqual({
            ok: true,
            action: "created",
            id: 7,
            tagId: 42,
        });
        expect(postedTagBody).toEqual({label: "umlautadaptarrex"});
        const proxyBody = postedProxyBody as {
            name: string;
            implementation: string;
            configContract: string;
            tags: number[];
            fields: { name: string; value: unknown }[];
        };
        expect(proxyBody.name).toBe("UmlautAdaptarrEX");
        expect(proxyBody.implementation).toBe("Http");
        expect(proxyBody.configContract).toBe("HttpProxySettings");
        expect(proxyBody.tags).toEqual([42]);
        const fieldByName = Object.fromEntries(
            proxyBody.fields.map((f) => [f.name, f.value]),
        );
        expect(fieldByName.host).toBe("192.168.1.5");
        expect(fieldByName.port).toBe(5006);
        expect(fieldByName.username).toBe("UmlautAdaptarr");
        expect(fieldByName.password).toBe("supersecret");
    });

    it("reuses existing tag and PUTs existing proxy", async () => {
        const pool = mockAgent.get(PROWLARR_HOST);

        let putBody: unknown;

        pool.intercept({path: "/api/v1/tag", method: "GET"}).reply(200, [
            {id: 11, label: "other"},
            {id: 99, label: "UmlautAdaptarrEx"},
        ]);
        pool
            .intercept({path: "/api/v1/indexerproxy/schema", method: "GET"})
            .reply(200, httpSchemaResponse());
        pool.intercept({path: "/api/v1/indexerproxy", method: "GET"}).reply(200, [
            {id: 3, name: "Some other proxy"},
            {id: 5, name: "UmlautAdaptarrEX"},
        ]);
        pool
            .intercept({path: "/api/v1/indexerproxy/5", method: "PUT"})
            .reply(202, (opts) => {
                putBody = JSON.parse(String(opts.body));
                return {id: 5, name: "UmlautAdaptarrEX"};
            });

        const result = await installUmlautProxy({
            prowlarrHost: PROWLARR_HOST,
            prowlarrApiKey: API_KEY,
            host: "host.docker.internal",
            port: 5006,
            username: "UmlautAdaptarr",
            password: "newpw",
        });

        expect(result).toEqual({
            ok: true,
            action: "updated",
            id: 5,
            tagId: 99,
        });
        const body = putBody as {
            id: number;
            tags: number[];
            fields: { name: string; value: unknown }[];
        };
        expect(body.id).toBe(5);
        expect(body.tags).toEqual([99]);
        const fieldByName = Object.fromEntries(
            body.fields.map((f) => [f.name, f.value]),
        );
        expect(fieldByName.host).toBe("host.docker.internal");
        expect(fieldByName.password).toBe("newpw");
    });

    it("returns 401 envelope when Prowlarr rejects API key", async () => {
        const pool = mockAgent.get(PROWLARR_HOST);
        pool
            .intercept({path: "/api/v1/tag", method: "GET"})
            .reply(401, "Unauthorized");

        const result = await installUmlautProxy({
            prowlarrHost: PROWLARR_HOST,
            prowlarrApiKey: API_KEY,
            host: "h",
            port: 5006,
            username: "u",
            password: "p",
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.status).toBe(401);
            expect(result.error).toMatch(/^HTTP 401/);
        }
    });

    it("returns error if Http schema is missing from Prowlarr", async () => {
        const pool = mockAgent.get(PROWLARR_HOST);
        pool
            .intercept({path: "/api/v1/tag", method: "GET"})
            .reply(200, [{id: 1, label: "umlautadaptarrex"}]);
        pool
            .intercept({path: "/api/v1/indexerproxy/schema", method: "GET"})
            .reply(200, [{implementation: "FlareSolverr", fields: []}]);

        const result = await installUmlautProxy({
            prowlarrHost: PROWLARR_HOST,
            prowlarrApiKey: API_KEY,
            host: "h",
            port: 5006,
            username: "u",
            password: "p",
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBe("http_schema_not_found");
        }
    });
});
