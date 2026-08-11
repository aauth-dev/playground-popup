"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc2) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/@hellocoop/httpsig/dist/types.js
  var require_types = __commonJS({
    "node_modules/@hellocoop/httpsig/dist/types.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.DEFAULT_COMPONENTS_BODY = exports.DEFAULT_COMPONENTS_GET = exports.VALID_DERIVED_COMPONENTS = void 0;
      exports.VALID_DERIVED_COMPONENTS = [
        "@method",
        "@target-uri",
        "@authority",
        "@scheme",
        "@request-target",
        "@path",
        "@query",
        "@query-param",
        "@status"
      ];
      exports.DEFAULT_COMPONENTS_GET = [
        "@method",
        "@authority",
        "@path",
        "signature-key"
      ];
      exports.DEFAULT_COMPONENTS_BODY = [
        "@method",
        "@authority",
        "@path",
        "content-type",
        "signature-key"
      ];
    }
  });

  // node_modules/@hellocoop/httpsig/dist/errors.js
  var require_errors = __commonJS({
    "node_modules/@hellocoop/httpsig/dist/errors.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.SignatureVerificationError = void 0;
      exports.invalidKey = invalidKey;
      exports.unsupportedAlgorithm = unsupportedAlgorithm;
      exports.unsupportedScheme = unsupportedScheme;
      exports.invalidJwt = invalidJwt;
      exports.issuerMissing = issuerMissing;
      exports.issuerMismatch = issuerMismatch;
      exports.expiredJwt = expiredJwt;
      exports.invalidInput = invalidInput;
      var SignatureVerificationError = class extends Error {
        code;
        requiredInput;
        supportedAlgorithms;
        constructor(code, message, options = {}) {
          super(message, { cause: options.cause });
          this.name = "SignatureVerificationError";
          this.code = code;
          this.requiredInput = options.requiredInput;
          this.supportedAlgorithms = options.supportedAlgorithms;
        }
      };
      exports.SignatureVerificationError = SignatureVerificationError;
      function invalidKey(message) {
        return new SignatureVerificationError("invalid_key", message);
      }
      function unsupportedAlgorithm(message, supportedAlgorithms) {
        return new SignatureVerificationError("unsupported_algorithm", message, {
          supportedAlgorithms
        });
      }
      function unsupportedScheme(message) {
        return new SignatureVerificationError("unsupported_scheme", message);
      }
      function invalidJwt(message) {
        return new SignatureVerificationError("invalid_jwt", message);
      }
      function issuerMissing(message) {
        return new SignatureVerificationError("issuer_missing", message);
      }
      function issuerMismatch(message) {
        return new SignatureVerificationError("issuer_mismatch", message);
      }
      function expiredJwt(message) {
        return new SignatureVerificationError("expired_jwt", message);
      }
      function invalidInput(message, requiredInput) {
        return new SignatureVerificationError("invalid_input", message, {
          requiredInput
        });
      }
    }
  });

  // node_modules/@hellocoop/httpsig/dist/utils/crypto.js
  var require_crypto = __commonJS({
    "node_modules/@hellocoop/httpsig/dist/utils/crypto.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.UNIMPLEMENTED_ALGORITHMS = exports.SYMMETRIC_ALGORITHMS = exports.POLYMORPHIC_ALGORITHMS = exports.SUPPORTED_ALGORITHMS = exports.FULLY_SPECIFIED_ALGORITHMS = void 0;
      exports.determineAlgorithm = determineAlgorithm;
      exports.getAlgorithmFromJwk = getAlgorithmFromJwk;
      exports.validateJwk = validateJwk;
      exports.importPrivateKey = importPrivateKey;
      exports.importPublicKey = importPublicKey;
      exports.getPublicJwk = getPublicJwk;
      exports.sign = sign;
      exports.verify = verify;
      exports.generateKeyPair = generateKeyPair;
      var errors_js_1 = require_errors();
      exports.FULLY_SPECIFIED_ALGORITHMS = {
        Ed25519: {
          kty: "OKP",
          crv: "Ed25519",
          params: { name: "Ed25519" }
        },
        Ed448: {
          kty: "OKP",
          crv: "Ed448",
          params: { name: "Ed448" }
        },
        ES256: {
          kty: "EC",
          crv: "P-256",
          params: { name: "ECDSA", namedCurve: "P-256", hash: "SHA-256" }
        },
        ES384: {
          kty: "EC",
          crv: "P-384",
          params: { name: "ECDSA", namedCurve: "P-384", hash: "SHA-384" }
        },
        ES512: {
          kty: "EC",
          crv: "P-521",
          params: { name: "ECDSA", namedCurve: "P-521", hash: "SHA-512" }
        },
        PS256: {
          kty: "RSA",
          params: { name: "RSA-PSS", hash: "SHA-256", saltLength: 32 }
        },
        PS384: {
          kty: "RSA",
          params: { name: "RSA-PSS", hash: "SHA-384", saltLength: 48 }
        },
        PS512: {
          kty: "RSA",
          params: { name: "RSA-PSS", hash: "SHA-512", saltLength: 64 }
        },
        RS256: {
          kty: "RSA",
          params: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }
        },
        RS384: {
          kty: "RSA",
          params: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-384" }
        },
        RS512: {
          kty: "RSA",
          params: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-512" }
        }
      };
      exports.SUPPORTED_ALGORITHMS = Object.freeze(Object.keys(exports.FULLY_SPECIFIED_ALGORITHMS));
      exports.POLYMORPHIC_ALGORITHMS = /* @__PURE__ */ new Set(["EdDSA"]);
      exports.SYMMETRIC_ALGORITHMS = /* @__PURE__ */ new Set([
        "HS256",
        "HS384",
        "HS512",
        "hmac-sha256"
      ]);
      exports.UNIMPLEMENTED_ALGORITHMS = /* @__PURE__ */ new Set([
        "ML-DSA-44",
        "ML-DSA-65",
        "ML-DSA-87"
      ]);
      var REQUIRED_MEMBERS = {
        OKP: ["crv", "x"],
        EC: ["crv", "x", "y"],
        RSA: ["n", "e"]
      };
      function determineAlgorithm(jwk) {
        if (!jwk || typeof jwk !== "object") {
          throw (0, errors_js_1.invalidKey)("JWK is not an object");
        }
        if (!jwk.kty) {
          throw (0, errors_js_1.invalidKey)("JWK missing required member: kty");
        }
        if (jwk.kty === "oct") {
          throw (0, errors_js_1.invalidKey)('Symmetric keys are not permitted: kty "oct" names a shared secret');
        }
        const alg = jwk.alg;
        if (!alg) {
          throw (0, errors_js_1.invalidKey)("JWK missing required member: alg. The algorithm is taken from the key and is not derived from kty and crv");
        }
        if (exports.SYMMETRIC_ALGORITHMS.has(alg)) {
          throw (0, errors_js_1.invalidKey)(`Symmetric algorithms are not permitted: "${alg}" names a shared secret`);
        }
        if (exports.POLYMORPHIC_ALGORITHMS.has(alg)) {
          throw (0, errors_js_1.invalidKey)(`Polymorphic algorithm identifier "${alg}" is not permitted. Use a fully-specified identifier such as Ed25519 or Ed448 (RFC 9864)`);
        }
        if (jwk.kty === "AKP" || exports.UNIMPLEMENTED_ALGORITHMS.has(alg)) {
          throw (0, errors_js_1.unsupportedAlgorithm)(`Algorithm "${alg}" (kty "${jwk.kty}") is not implemented by this verifier`);
        }
        const spec = exports.FULLY_SPECIFIED_ALGORITHMS[alg];
        if (!spec) {
          throw (0, errors_js_1.unsupportedAlgorithm)(`Unsupported or not fully-specified algorithm: "${alg}"`);
        }
        if (jwk.kty !== spec.kty) {
          throw (0, errors_js_1.invalidKey)(`JWK kty "${jwk.kty}" is inconsistent with alg "${alg}", which requires kty "${spec.kty}"`);
        }
        if (spec.crv && jwk.crv !== spec.crv) {
          throw (0, errors_js_1.invalidKey)(`JWK crv "${jwk.crv}" is inconsistent with alg "${alg}", which requires crv "${spec.crv}"`);
        }
        for (const member of REQUIRED_MEMBERS[spec.kty] ?? []) {
          if (!jwk[member]) {
            throw (0, errors_js_1.invalidKey)(`${spec.kty} JWK missing required member: ${member}`);
          }
        }
        return spec.params;
      }
      function getAlgorithmFromJwk(jwk) {
        return determineAlgorithm(jwk);
      }
      function validateJwk(jwk) {
        determineAlgorithm(jwk);
      }
      function withoutAlg(jwk) {
        const { alg: _alg, ...rest } = jwk;
        return rest;
      }
      async function importPrivateKey(jwk) {
        const algorithm = determineAlgorithm(jwk);
        return await crypto.subtle.importKey("jwk", withoutAlg(jwk), algorithm, false, ["sign"]);
      }
      async function importPublicKey(jwk) {
        const algorithm = determineAlgorithm(jwk);
        return await crypto.subtle.importKey("jwk", withoutAlg(jwk), algorithm, false, ["verify"]);
      }
      function getPublicJwk(privateJwk) {
        const { d, p, q, dp, dq, qi, ...publicJwk } = privateJwk;
        return publicJwk;
      }
      async function sign(data, privateKey, algorithm) {
        const signature = await crypto.subtle.sign(algorithm, privateKey, data);
        return new Uint8Array(signature);
      }
      async function verify(data, signature, publicKey, algorithm) {
        return await crypto.subtle.verify(algorithm, publicKey, signature, data);
      }
      async function generateKeyPair(options) {
        const algorithm = options?.algorithm ?? "Ed25519";
        const extractable = options?.extractable ?? true;
        const spec = exports.FULLY_SPECIFIED_ALGORITHMS[algorithm];
        if (!spec) {
          throw new Error(`Unsupported algorithm: ${algorithm}`);
        }
        const genAlgorithm = spec.crv ? spec.params.name === "ECDSA" ? { name: "ECDSA", namedCurve: spec.crv } : { name: spec.params.name } : { name: spec.params.name };
        const keyPair = await crypto.subtle.generateKey(genAlgorithm, extractable, ["sign", "verify"]);
        const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
        publicKey.alg = algorithm;
        return {
          privateKey: keyPair.privateKey,
          publicKey
        };
      }
    }
  });

  // node_modules/@hellocoop/httpsig/dist/utils/base64.js
  var require_base64 = __commonJS({
    "node_modules/@hellocoop/httpsig/dist/utils/base64.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.base64urlEncode = base64urlEncode;
      exports.base64urlDecode = base64urlDecode;
      exports.base64Encode = base64Encode;
      exports.base64Decode = base64Decode;
      exports.sha256 = sha256;
      exports.sha512 = sha512;
      function bytesToBase64(bytes) {
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
      }
      function base64ToBytes(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
      }
      function base64urlEncode(data) {
        const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
        const base64 = bytesToBase64(bytes);
        return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
      }
      function base64urlDecode(data) {
        let padded = data;
        const padding = (4 - data.length % 4) % 4;
        if (padding > 0) {
          padded += "=".repeat(padding);
        }
        const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
        return base64ToBytes(base64);
      }
      function base64Encode(data) {
        const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
        return bytesToBase64(bytes);
      }
      function base64Decode(data) {
        return base64ToBytes(data);
      }
      async function sha256(data) {
        const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
        const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
        return new Uint8Array(hashBuffer);
      }
      async function sha512(data) {
        const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
        const hashBuffer = await crypto.subtle.digest("SHA-512", bytes);
        return new Uint8Array(hashBuffer);
      }
    }
  });

  // node_modules/@hellocoop/httpsig/dist/utils/signature.js
  var require_signature = __commonJS({
    "node_modules/@hellocoop/httpsig/dist/utils/signature.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.generateSignatureBase = generateSignatureBase;
      exports.generateSignatureInputHeader = generateSignatureInputHeader;
      exports.generateSignatureKeyHeader = generateSignatureKeyHeader;
      exports.generateSignatureHeader = generateSignatureHeader;
      exports.generateContentDigest = generateContentDigest;
      exports.parseSignatureInput = parseSignatureInput;
      exports.parseSignatureKey = parseSignatureKey;
      exports.generateSignatureErrorHeader = generateSignatureErrorHeader;
      exports.parseSignatureError = parseSignatureError;
      exports.generateAcceptSignatureSchemeHeader = generateAcceptSignatureSchemeHeader;
      exports.parseAcceptSignatureScheme = parseAcceptSignatureScheme;
      exports.generateAcceptSignatureAlgHeader = generateAcceptSignatureAlgHeader;
      exports.parseAcceptSignatureAlg = parseAcceptSignatureAlg;
      exports.generateAcceptSignatureHeader = generateAcceptSignatureHeader;
      exports.parseAcceptSignature = parseAcceptSignature;
      exports.parseSignature = parseSignature;
      var base64_js_1 = require_base64();
      var errors_js_1 = require_errors();
      function generateSignatureBase(components, componentValues) {
        const lines = [];
        for (const component of components) {
          const value = componentValues.get(component);
          if (value === void 0) {
            throw new Error(`Missing value for component: ${component}`);
          }
          lines.push(`"${component}": ${value}`);
        }
        return lines.join("\n");
      }
      function generateSignatureInputHeader(label, components, created) {
        const componentList = components.map((c) => `"${c}"`).join(" ");
        return `${label}=(${componentList});created=${created}`;
      }
      function generateSignatureKeyHeader(label, signatureKey, publicJwk) {
        if (signatureKey.type === "hwk") {
          if (!publicJwk) {
            throw new Error("Public JWK required for hwk signature key type");
          }
          if (!publicJwk.alg) {
            throw new Error("Public JWK missing required alg member for hwk signature key type");
          }
          const params = [
            `alg="${publicJwk.alg}"`,
            `kty="${publicJwk.kty}"`
          ];
          if (publicJwk.crv)
            params.push(`crv="${publicJwk.crv}"`);
          if (publicJwk.x)
            params.push(`x="${publicJwk.x}"`);
          if (publicJwk.y)
            params.push(`y="${publicJwk.y}"`);
          if (publicJwk.n)
            params.push(`n="${publicJwk.n}"`);
          if (publicJwk.e)
            params.push(`e="${publicJwk.e}"`);
          return `${label}=hwk;${params.join(";")}`;
        }
        if (signatureKey.type === "jwt") {
          return `${label}=jwt;jwt="${signatureKey.jwt}"`;
        }
        if (signatureKey.type === "jkt_jwt") {
          return `${label}=jkt-jwt;jwt="${signatureKey.jwt}"`;
        }
        if (signatureKey.type === "jwks_uri") {
          const params = [
            `id="${signatureKey.id}"`,
            `dwk="${signatureKey.dwk}"`,
            `kid="${signatureKey.kid}"`
          ];
          return `${label}=jwks_uri;${params.join(";")}`;
        }
        throw new Error(`Unsupported signature key type: ${signatureKey.type}`);
      }
      function generateSignatureHeader(label, signature) {
        const encoded = (0, base64_js_1.base64Encode)(signature);
        return `${label}=:${encoded}:`;
      }
      async function generateContentDigest(body) {
        let bytes;
        if (typeof body === "string") {
          bytes = new TextEncoder().encode(body);
        } else if (body instanceof Uint8Array) {
          bytes = body;
        } else if (body instanceof ArrayBuffer) {
          bytes = new Uint8Array(body);
        } else if (Buffer.isBuffer(body)) {
          bytes = new Uint8Array(body);
        } else {
          bytes = new TextEncoder().encode(String(body));
        }
        const hash = await (0, base64_js_1.sha256)(bytes);
        const encoded = (0, base64_js_1.base64Encode)(hash);
        return `sha-256=:${encoded}:`;
      }
      function parseSignatureInput(header) {
        const results = [];
        const parts = header.split(",").map((p) => p.trim());
        for (const part of parts) {
          const match = part.match(/^([^=]+)=\(([^)]*)\);(.+)$/);
          if (!match) {
            throw new Error(`Invalid Signature-Input format: ${part}`);
          }
          const label = match[1].trim();
          const componentsStr = match[2];
          const paramsStr = match[3];
          const components = componentsStr.split(/\s+/).map((c) => c.replace(/"/g, "")).filter((c) => c);
          const params = {};
          const paramPairs = paramsStr.split(";").map((p) => p.trim());
          for (const pair of paramPairs) {
            const [key, value] = pair.split("=").map((s) => s.trim());
            if (key === "created") {
              params.created = parseInt(value, 10);
            } else {
              params[key] = value;
            }
          }
          if (!params.created) {
            throw new Error("Signature-Input missing required parameter: created");
          }
          results.push({ label, components, params });
        }
        return results;
      }
      function parseSignatureKey(header) {
        const trimmed = header.trim();
        let inQuote = false;
        for (let i = 0; i < trimmed.length; i++) {
          if (trimmed[i] === '"' && (i === 0 || trimmed[i - 1] !== "\\")) {
            inQuote = !inQuote;
          } else if (trimmed[i] === "," && !inQuote) {
            throw new Error("Invalid Signature-Key: must have exactly one dictionary member");
          }
        }
        const match = trimmed.match(/^([\w-]+)=([\w-]+)(.*)$/);
        if (!match) {
          throw new Error("Invalid Signature-Key: must be RFC 8941 Dictionary with format label=scheme;params");
        }
        const label = match[1];
        const scheme = match[2];
        const paramsStr = match[3];
        const params = {};
        if (paramsStr) {
          const paramMatches = paramsStr.matchAll(/;([\w-]+)=(?:"([^"]*)"|(\w+))/g);
          for (const paramMatch of paramMatches) {
            const key = paramMatch[1];
            const value = paramMatch[2] !== void 0 ? paramMatch[2] : paramMatch[3];
            params[key] = value;
          }
        }
        if (!["hwk", "jwt", "jkt-jwt", "jwks_uri"].includes(scheme)) {
          throw (0, errors_js_1.unsupportedScheme)(`Unsupported Signature-Key scheme: ${scheme}`);
        }
        if (scheme === "hwk") {
          if (!params.kty) {
            throw (0, errors_js_1.invalidKey)("Signature-Key hwk scheme missing kty parameter");
          }
          if (!params.alg) {
            throw (0, errors_js_1.invalidKey)("Signature-Key hwk scheme missing alg parameter");
          }
          if (params.kid !== void 0) {
            throw (0, errors_js_1.invalidKey)("Signature-Key hwk scheme MUST NOT include a kid parameter");
          }
          return [{ label, type: "hwk", value: params }];
        }
        if (scheme === "jwt") {
          if (!params.jwt) {
            throw new Error("Signature-Key jwt scheme missing jwt parameter");
          }
          return [
            {
              label,
              type: "jwt",
              value: { jwt: params.jwt }
            }
          ];
        }
        if (scheme === "jkt-jwt") {
          if (!params.jwt) {
            throw new Error("Signature-Key jkt-jwt scheme missing jwt parameter");
          }
          return [
            {
              label,
              type: "jkt_jwt",
              value: { jwt: params.jwt }
            }
          ];
        }
        if (scheme === "jwks_uri") {
          if (!params.id || !params.dwk || !params.kid) {
            throw new Error("Signature-Key jwks_uri scheme missing required id/dwk/kid parameters");
          }
          return [
            {
              label,
              type: "jwks_uri",
              value: {
                id: params.id,
                kid: params.kid,
                dwk: params.dwk
              }
            }
          ];
        }
        throw (0, errors_js_1.unsupportedScheme)(`Unsupported Signature-Key scheme: ${scheme}`);
      }
      function generateSignatureErrorHeader(signatureError) {
        const parts = [`error=${signatureError.error}`];
        if (signatureError.required_input) {
          const inputList = signatureError.required_input.map((c) => `"${c}"`).join(" ");
          parts.push(`required_input=(${inputList})`);
        }
        return parts.join(", ");
      }
      function parseSignatureError(header) {
        const trimmed = header.trim();
        const errorMatch = trimmed.match(/error=([\w]+)/);
        if (!errorMatch) {
          throw new Error("Invalid Signature-Error: missing error member");
        }
        const error = errorMatch[1];
        const validCodes = [
          "unsupported_algorithm",
          "unsupported_scheme",
          "invalid_signature",
          "invalid_input",
          "invalid_request",
          "invalid_key",
          "unknown_key",
          "invalid_jwt",
          "expired_jwt",
          "issuer_missing",
          "issuer_mismatch"
        ];
        if (!validCodes.includes(error)) {
          throw new Error(`Invalid Signature-Error code: ${error}`);
        }
        const result = { error };
        const inputMatch = trimmed.match(/required_input=\(([^)]*)\)/);
        if (inputMatch) {
          result.required_input = inputMatch[1].split(/\s+/).map((c) => c.replace(/"/g, "")).filter((c) => c);
        }
        return result;
      }
      function generateTokenList(values) {
        for (const value of values) {
          if (!/^[A-Za-z*][A-Za-z0-9!#$%&'*+\-.^_`|~:/]*$/.test(value)) {
            throw new Error(`Value is not a valid Structured Field Token: ${value}`);
          }
        }
        return values.join(", ");
      }
      function parseTokenList(header) {
        return header.split(",").map((v) => v.trim()).filter((v) => /^[A-Za-z*][A-Za-z0-9!#$%&'*+\-.^_`|~:/]*$/.test(v));
      }
      function generateAcceptSignatureSchemeHeader(schemes) {
        return generateTokenList(schemes);
      }
      function parseAcceptSignatureScheme(header) {
        return parseTokenList(header);
      }
      function generateAcceptSignatureAlgHeader(algs) {
        return generateTokenList(algs);
      }
      function parseAcceptSignatureAlg(header) {
        return parseTokenList(header);
      }
      function generateAcceptSignatureHeader(params) {
        const { label = "sig", components, alg, tag } = params;
        const componentList = components.map((c) => `"${c}"`).join(" ");
        let header = `${label}=(${componentList})`;
        if (alg) {
          header += `;alg="${alg}"`;
        }
        if (tag) {
          header += `;tag="${tag}"`;
        }
        return header;
      }
      function parseAcceptSignature(header) {
        const trimmed = header.trim();
        const match = trimmed.match(/^([\w-]+)=\(([^)]*)\)(.*)$/);
        if (!match) {
          throw new Error("Invalid Accept-Signature format");
        }
        const label = match[1];
        const componentsStr = match[2];
        const paramsStr = match[3];
        const components = componentsStr.split(/\s+/).map((c) => c.replace(/"/g, "")).filter((c) => c);
        const result = { label, components };
        if (paramsStr) {
          const algMatch = paramsStr.match(/;alg="([^"]*)"/);
          if (algMatch) {
            result.alg = algMatch[1];
          }
          const tagMatch = paramsStr.match(/;tag="([^"]*)"/);
          if (tagMatch) {
            result.tag = tagMatch[1];
          }
        }
        return result;
      }
      function parseSignature(header) {
        const results = /* @__PURE__ */ new Map();
        const entries = header.split(/,(?=\s*\w+=)/);
        for (const entry of entries) {
          const trimmed = entry.trim();
          const match = trimmed.match(/^([^=]+)=:([^:]+):$/);
          if (!match) {
            throw new Error(`Invalid Signature format: ${trimmed}`);
          }
          const label = match[1].trim();
          const base64 = match[2];
          const signature = Buffer.from(base64, "base64");
          results.set(label, new Uint8Array(signature));
        }
        return results;
      }
    }
  });

  // node_modules/@hellocoop/httpsig/dist/fetch.js
  var require_fetch = __commonJS({
    "node_modules/@hellocoop/httpsig/dist/fetch.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.fetch = fetch2;
      var types_js_1 = require_types();
      var crypto_js_1 = require_crypto();
      var signature_js_1 = require_signature();
      function getContentTypeFromBody(body) {
        if (body === null || body === void 0) {
          return null;
        }
        if (body instanceof URLSearchParams) {
          return "application/x-www-form-urlencoded;charset=UTF-8";
        }
        if (typeof FormData !== "undefined" && body instanceof FormData) {
          return null;
        }
        if (typeof Blob !== "undefined" && body instanceof Blob) {
          return body.type || "application/octet-stream";
        }
        if (typeof body === "string") {
          return "text/plain;charset=UTF-8";
        }
        return "application/octet-stream";
      }
      function validateComponents(components, headers) {
        for (const component of components) {
          if (component === "@signature-params" || component === "signature-key" || component === "signature-input" || component === "signature") {
            continue;
          }
          if (component.startsWith("@")) {
            if (!types_js_1.VALID_DERIVED_COMPONENTS.includes(component)) {
              throw new Error(`Invalid derived component: ${component}`);
            }
          } else {
            if (!headers.has(component)) {
              throw new Error(`Component "${component}" specified but header not found in request`);
            }
          }
        }
      }
      async function fetch2(url, options) {
        const { signingKey, signingCryptoKey, signatureKey, label = "sig", components: customComponents, dryRun = false, returnSent = false, method = "GET", headers: inputHeaders = {}, body, ...fetchOptions } = options;
        (0, crypto_js_1.validateJwk)(signingKey);
        let privateKey;
        let algorithm;
        if (signingKey.d) {
          privateKey = await (0, crypto_js_1.importPrivateKey)(signingKey);
          algorithm = (0, crypto_js_1.getAlgorithmFromJwk)(signingKey);
        } else {
          if (!signingCryptoKey) {
            throw new Error("signingCryptoKey is required when signingKey does not contain private key material");
          }
          privateKey = signingCryptoKey;
          algorithm = (0, crypto_js_1.getAlgorithmFromJwk)(signingKey);
        }
        const publicJwk = (0, crypto_js_1.getPublicJwk)(signingKey);
        const urlObj = typeof url === "string" ? new URL(url) : url;
        const targetUri = urlObj.href;
        const headers = new Headers(inputHeaders);
        let components;
        if (customComponents) {
          components = [...new Set(customComponents)];
        } else {
          const hasBody = body !== void 0 && body !== null;
          components = hasBody ? [...types_js_1.DEFAULT_COMPONENTS_BODY] : [...types_js_1.DEFAULT_COMPONENTS_GET];
        }
        const componentValues = /* @__PURE__ */ new Map();
        if (body !== void 0 && body !== null) {
          if (!headers.has("content-type")) {
            const autoContentType = getContentTypeFromBody(body);
            if (autoContentType !== null) {
              headers.set("content-type", autoContentType);
            }
          }
          if (components.includes("content-digest")) {
            const contentDigest = await (0, signature_js_1.generateContentDigest)(body);
            headers.set("content-digest", contentDigest);
          }
        }
        if (components.includes("signature-key")) {
          const signatureKeyHeader = (0, signature_js_1.generateSignatureKeyHeader)(label, signatureKey, publicJwk);
          headers.set("signature-key", signatureKeyHeader);
        }
        validateComponents(components, headers);
        for (const component of components) {
          if (component.startsWith("@")) {
            switch (component) {
              case "@method":
                componentValues.set("@method", method.toUpperCase());
                break;
              case "@target-uri":
                componentValues.set("@target-uri", targetUri);
                break;
              case "@authority":
                componentValues.set("@authority", urlObj.host);
                break;
              case "@scheme":
                componentValues.set("@scheme", urlObj.protocol.replace(":", ""));
                break;
              case "@request-target":
                componentValues.set("@request-target", `${urlObj.pathname}${urlObj.search}`);
                break;
              case "@path":
                componentValues.set("@path", urlObj.pathname);
                break;
              case "@query":
                componentValues.set("@query", urlObj.search ? urlObj.search.substring(1) : "");
                break;
              default:
                throw new Error(`Unsupported derived component: ${component}`);
            }
          } else {
            const value = headers.get(component);
            if (value !== null) {
              componentValues.set(component, value);
            }
          }
        }
        const created = Math.floor(Date.now() / 1e3);
        const signatureInputHeader = (0, signature_js_1.generateSignatureInputHeader)(label, components, created);
        headers.set("signature-input", signatureInputHeader);
        const componentList = components.map((c) => `"${c}"`).join(" ");
        const signatureParams = `(${componentList});created=${created}`;
        componentValues.set("@signature-params", signatureParams);
        components.push("@signature-params");
        const signatureBase = (0, signature_js_1.generateSignatureBase)(components, componentValues);
        const signatureBaseBytes = new TextEncoder().encode(signatureBase);
        const signature = await (0, crypto_js_1.sign)(signatureBaseBytes, privateKey, algorithm);
        const signatureHeader = (0, signature_js_1.generateSignatureHeader)(label, signature);
        headers.set("signature", signatureHeader);
        if (dryRun) {
          return { headers };
        }
        const response = await globalThis.fetch(urlObj, {
          ...fetchOptions,
          method,
          headers,
          body
        });
        if (returnSent) {
          return {
            response,
            sent: {
              method,
              url: urlObj.href,
              headers,
              body: body ?? null
            }
          };
        }
        return response;
      }
    }
  });

  // node_modules/@hellocoop/httpsig/dist/utils/thumbprint.js
  var require_thumbprint = __commonJS({
    "node_modules/@hellocoop/httpsig/dist/utils/thumbprint.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.calculateThumbprint = calculateThumbprint;
      var base64_js_1 = require_base64();
      async function calculateThumbprint(jwk, hashAlgorithm = "SHA-256") {
        let canonical;
        switch (jwk.kty) {
          case "OKP": {
            if (!jwk.crv || !jwk.x) {
              throw new Error("OKP key missing required fields (crv, x)");
            }
            canonical = JSON.stringify({
              crv: jwk.crv,
              kty: jwk.kty,
              x: jwk.x
            });
            break;
          }
          case "EC": {
            if (!jwk.crv || !jwk.x || !jwk.y) {
              throw new Error("EC key missing required fields (crv, x, y)");
            }
            canonical = JSON.stringify({
              crv: jwk.crv,
              kty: jwk.kty,
              x: jwk.x,
              y: jwk.y
            });
            break;
          }
          case "RSA": {
            if (!jwk.e || !jwk.n) {
              throw new Error("RSA key missing required fields (e, n)");
            }
            canonical = JSON.stringify({
              e: jwk.e,
              kty: jwk.kty,
              n: jwk.n
            });
            break;
          }
          default:
            throw new Error(`Unsupported key type: ${jwk.kty}`);
        }
        const hashFn = hashAlgorithm === "SHA-512" ? base64_js_1.sha512 : base64_js_1.sha256;
        const hash = await hashFn(canonical);
        return (0, base64_js_1.base64urlEncode)(hash);
      }
    }
  });

  // node_modules/@hellocoop/httpsig/dist/utils/cache.js
  var require_cache = __commonJS({
    "node_modules/@hellocoop/httpsig/dist/utils/cache.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.BoundedTtlCache = exports.DEFAULT_MAX_ENTRIES = void 0;
      exports.DEFAULT_MAX_ENTRIES = 100;
      var BoundedTtlCache = class {
        entries = /* @__PURE__ */ new Map();
        maxEntries;
        constructor(maxEntries = exports.DEFAULT_MAX_ENTRIES) {
          if (!Number.isInteger(maxEntries) || maxEntries < 1) {
            throw new Error("maxEntries must be a positive integer");
          }
          this.maxEntries = maxEntries;
        }
        get size() {
          return this.entries.size;
        }
        get(key) {
          const entry = this.entries.get(key);
          if (!entry) {
            return void 0;
          }
          if (entry.expiresAt <= Date.now()) {
            this.entries.delete(key);
            return void 0;
          }
          this.entries.delete(key);
          this.entries.set(key, entry);
          return entry.value;
        }
        set(key, value, ttlMs) {
          this.entries.delete(key);
          if (this.entries.size >= this.maxEntries) {
            this.evictOne();
          }
          this.entries.set(key, { value, expiresAt: Date.now() + ttlMs });
        }
        clear() {
          this.entries.clear();
        }
        /**
         * Drop an expired entry if there is one, otherwise the least recently
         * used. Preferring expired entries keeps live ones around longer without
         * changing the bound.
         */
        evictOne() {
          const now = Date.now();
          for (const [key, entry] of this.entries) {
            if (entry.expiresAt <= now) {
              this.entries.delete(key);
              return;
            }
          }
          const oldest = this.entries.keys().next();
          if (!oldest.done) {
            this.entries.delete(oldest.value);
          }
        }
      };
      exports.BoundedTtlCache = BoundedTtlCache;
    }
  });

  // node_modules/@hellocoop/httpsig/dist/verify.js
  var require_verify = __commonJS({
    "node_modules/@hellocoop/httpsig/dist/verify.js"(exports) {
      "use strict";
      var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        var desc2 = Object.getOwnPropertyDescriptor(m, k);
        if (!desc2 || ("get" in desc2 ? !m.__esModule : desc2.writable || desc2.configurable)) {
          desc2 = { enumerable: true, get: function() {
            return m[k];
          } };
        }
        Object.defineProperty(o, k2, desc2);
      }) : (function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        o[k2] = m[k];
      }));
      var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }) : function(o, v) {
        o["default"] = v;
      });
      var __importStar = exports && exports.__importStar || /* @__PURE__ */ (function() {
        var ownKeys = function(o) {
          ownKeys = Object.getOwnPropertyNames || function(o2) {
            var ar = [];
            for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
            return ar;
          };
          return ownKeys(o);
        };
        return function(mod) {
          if (mod && mod.__esModule) return mod;
          var result = {};
          if (mod != null) {
            for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
          }
          __setModuleDefault(result, mod);
          return result;
        };
      })();
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.verify = verify;
      var crypto_js_1 = require_crypto();
      var signature_js_1 = require_signature();
      var base64_js_1 = require_base64();
      var thumbprint_js_1 = require_thumbprint();
      var cache_js_1 = require_cache();
      var errors_js_1 = require_errors();
      var jwksCache = new cache_js_1.BoundedTtlCache();
      function toSignatureError(error) {
        if (error instanceof errors_js_1.SignatureVerificationError) {
          const result = { error: error.code };
          if (error.requiredInput) {
            result.required_input = error.requiredInput;
          }
          return result;
        }
        return mapToSignatureError(error instanceof Error ? error.message : String(error));
      }
      function mapToSignatureError(errorMessage) {
        if (errorMessage.includes("Missing Signature-Key") || errorMessage.includes("Missing Signature-Input") || errorMessage.includes("Missing Signature") || errorMessage.includes("No signature found") || errorMessage.includes("No Signature-Input found") || errorMessage.includes("does not verify") || errorMessage.includes("Signature timestamp out of")) {
          return { error: "invalid_signature" };
        }
        if (errorMessage.includes("AAuth profile violation")) {
          return {
            error: "invalid_input",
            required_input: ["@method", "@authority", "@path", "signature-key"]
          };
        }
        if (errorMessage.includes("content-digest")) {
          return { error: "invalid_input" };
        }
        if (errorMessage.includes("Missing header for component")) {
          return { error: "invalid_input" };
        }
        if (errorMessage.includes("Unsupported signature key type") || errorMessage.includes("Unsupported Signature-Key scheme")) {
          return { error: "invalid_key" };
        }
        if (errorMessage.includes("Signature-Key") && errorMessage.includes("missing")) {
          return { error: "invalid_key" };
        }
        if (errorMessage.includes("Invalid JWK") || errorMessage.includes("validate") || errorMessage.includes("kty parameter")) {
          return { error: "invalid_key" };
        }
        if (errorMessage.includes("not found in JWKS") || errorMessage.includes("unknown_key")) {
          return { error: "unknown_key" };
        }
        if (errorMessage.includes("jkt-jwt: JWT expired")) {
          return { error: "expired_jwt" };
        }
        if (errorMessage.includes("jkt-jwt:") || errorMessage.includes("Invalid JWT") || errorMessage.includes("JWT missing")) {
          return { error: "invalid_jwt" };
        }
        return { error: "invalid_signature" };
      }
      function normalizeHeaders(headers) {
        const result = /* @__PURE__ */ new Map();
        if (headers instanceof Headers) {
          headers.forEach((value, key) => {
            result.set(key.toLowerCase(), value);
          });
        } else {
          for (const [key, value] of Object.entries(headers)) {
            const normalized = Array.isArray(value) ? value.join(", ") : value;
            result.set(key.toLowerCase(), normalized);
          }
        }
        return result;
      }
      async function fetchJWKS(url, cacheTtl) {
        const cached = jwksCache.get(url);
        if (cached !== void 0) {
          return cached;
        }
        const response = await globalThis.fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch JWKS from ${url}: ${response.statusText}`);
        }
        const jwks = await response.json();
        jwksCache.set(url, jwks, cacheTtl);
        return jwks;
      }
      async function getPublicKeyFromJWKS(id, kid, dwk, cacheTtl) {
        const metadataUrl = `${id}/.well-known/${dwk}`;
        const metadata = await fetchJWKS(metadataUrl, cacheTtl);
        if (metadata.issuer === void 0) {
          throw (0, errors_js_1.issuerMissing)(`Metadata document missing issuer: ${metadataUrl}`);
        }
        if (metadata.issuer !== id) {
          throw (0, errors_js_1.issuerMismatch)(`Metadata issuer "${metadata.issuer}" does not match id "${id}"`);
        }
        if (!metadata.jwks_uri) {
          throw new Error(`Metadata document missing jwks_uri: ${metadataUrl}`);
        }
        const jwksUrl = metadata.jwks_uri;
        const jwks = await fetchJWKS(jwksUrl, cacheTtl);
        if (!jwks.keys || !Array.isArray(jwks.keys)) {
          throw new Error(`Invalid JWKS format from ${jwksUrl}`);
        }
        const key = jwks.keys.find((k) => k.kid === kid);
        if (!key) {
          throw new Error(`Key with kid="${kid}" not found in JWKS from ${jwksUrl}`);
        }
        return key;
      }
      function decodeJWT(jwt, maxClockSkew) {
        const parts = jwt.split(".");
        if (parts.length !== 3) {
          throw (0, errors_js_1.invalidJwt)("Invalid JWT format");
        }
        let header;
        let payload;
        try {
          header = JSON.parse(new TextDecoder().decode((0, base64_js_1.base64urlDecode)(parts[0])));
          payload = JSON.parse(new TextDecoder().decode((0, base64_js_1.base64urlDecode)(parts[1])));
        } catch {
          throw (0, errors_js_1.invalidJwt)("Invalid JWT: header or payload is not valid JSON");
        }
        if (!payload.cnf || !payload.cnf.jwk) {
          throw (0, errors_js_1.invalidJwt)("JWT missing cnf.jwk claim");
        }
        const now = Math.floor(Date.now() / 1e3);
        if (typeof payload.exp !== "number") {
          throw (0, errors_js_1.invalidJwt)("JWT missing required exp claim");
        }
        if (payload.exp + maxClockSkew < now) {
          throw (0, errors_js_1.expiredJwt)("JWT expired");
        }
        if (payload.iat !== void 0) {
          if (typeof payload.iat !== "number") {
            throw (0, errors_js_1.invalidJwt)("JWT iat claim is not a number");
          }
          if (payload.iat - maxClockSkew > now) {
            throw (0, errors_js_1.invalidJwt)("JWT iat is in the future");
          }
        }
        return {
          header,
          payload,
          publicKey: payload.cnf.jwk
        };
      }
      var JKT_JWT_TYPES = {
        "jkt-s256+jwt": {
          hashAlgorithm: "SHA-256",
          issPrefix: "urn:jkt:sha-256:"
        },
        "jkt-s512+jwt": {
          hashAlgorithm: "SHA-512",
          issPrefix: "urn:jkt:sha-512:"
        }
      };
      async function verifyJktJwt(jwtString, maxClockSkew) {
        const parts = jwtString.split(".");
        if (parts.length !== 3) {
          throw new Error("Invalid JWT format");
        }
        const header = JSON.parse(new TextDecoder().decode((0, base64_js_1.base64urlDecode)(parts[0])));
        const payload = JSON.parse(new TextDecoder().decode((0, base64_js_1.base64urlDecode)(parts[1])));
        const typConfig = JKT_JWT_TYPES[header.typ];
        if (!typConfig) {
          throw new Error(`Unsupported jkt-jwt typ: ${header.typ}. Supported: ${Object.keys(JKT_JWT_TYPES).join(", ")}`);
        }
        const identityJwk = header.jwk;
        if (!identityJwk) {
          throw new Error("jkt-jwt: JWT header missing jwk claim");
        }
        const thumbprint = await (0, thumbprint_js_1.calculateThumbprint)(identityJwk, typConfig.hashAlgorithm);
        const expectedIss = `${typConfig.issPrefix}${thumbprint}`;
        if (payload.iss !== expectedIss) {
          throw new Error(`jkt-jwt: iss mismatch. Expected ${expectedIss}, got ${payload.iss}`);
        }
        (0, crypto_js_1.validateJwk)(identityJwk);
        const identityPublicKey = await (0, crypto_js_1.importPublicKey)(identityJwk);
        const algorithm = (0, crypto_js_1.getAlgorithmFromJwk)(identityJwk);
        const signedData = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
        const signature = (0, base64_js_1.base64urlDecode)(parts[2]);
        const jwtValid = await (0, crypto_js_1.verify)(signedData, signature, identityPublicKey, algorithm);
        if (!jwtValid) {
          throw new Error("jkt-jwt: JWT signature verification failed");
        }
        const now = Math.floor(Date.now() / 1e3);
        if (!payload.exp || typeof payload.exp !== "number") {
          throw new Error("jkt-jwt: JWT missing exp claim");
        }
        if (payload.exp + maxClockSkew < now) {
          throw new Error("jkt-jwt: JWT expired");
        }
        if (!payload.iat || typeof payload.iat !== "number") {
          throw new Error("jkt-jwt: JWT missing iat claim");
        }
        if (payload.iat - maxClockSkew > now) {
          throw new Error("jkt-jwt: JWT iat is in the future");
        }
        if (!payload.cnf || !payload.cnf.jwk) {
          throw new Error("jkt-jwt: JWT missing cnf.jwk claim");
        }
        return {
          header,
          payload,
          ephemeralKey: payload.cnf.jwk,
          identityKey: identityJwk,
          identityThumbprint: expectedIss
        };
      }
      async function verify(request, options = {}) {
        const {
          maxClockSkew = 60,
          jwksCacheTtl = 36e5,
          // 1 hour
          supportedAlgorithms
        } = options;
        const accepted = supportedAlgorithms ?? crypto_js_1.SUPPORTED_ALGORITHMS;
        try {
          const headers = normalizeHeaders(request.headers);
          const signatureKeyHeader = headers.get("signature-key");
          if (!signatureKeyHeader) {
            throw new Error("Missing Signature-Key header");
          }
          const signatureKeys = (0, signature_js_1.parseSignatureKey)(signatureKeyHeader);
          const signatureKey = signatureKeys[0];
          const label = signatureKey.label;
          const signatureInputHeader = headers.get("signature-input");
          if (!signatureInputHeader) {
            throw new Error("Missing Signature-Input header");
          }
          const signatureInputs = (0, signature_js_1.parseSignatureInput)(signatureInputHeader);
          const signatureInput = signatureInputs.find((si) => si.label === label);
          if (!signatureInput) {
            throw new Error(`No Signature-Input found for label "${label}" from Signature-Key`);
          }
          const { components, params } = signatureInput;
          if (!components.includes("signature-key")) {
            throw (0, errors_js_1.invalidInput)("signature-key must be a covered component", [
              "@method",
              "@authority",
              "@path",
              "signature-key"
            ]);
          }
          const now = Math.floor(Date.now() / 1e3);
          const skew = Math.abs(now - params.created);
          if (skew > maxClockSkew) {
            throw new Error(`Signature timestamp out of acceptable range (skew: ${skew}s)`);
          }
          let publicJwk;
          let jwtData;
          let jktJwtData;
          let jwksUriData;
          if (signatureKey.type === "hwk") {
            publicJwk = signatureKey.value;
          } else if (signatureKey.type === "jwt") {
            const jwtValue = signatureKey.value;
            const { header, payload, publicKey: publicKey2 } = decodeJWT(jwtValue.jwt, maxClockSkew);
            publicJwk = publicKey2;
            jwtData = {
              header,
              payload,
              raw: jwtValue.jwt
            };
          } else if (signatureKey.type === "jkt_jwt") {
            const jwtValue = signatureKey.value;
            const { header, payload, ephemeralKey, identityKey, identityThumbprint } = await verifyJktJwt(jwtValue.jwt, maxClockSkew);
            publicJwk = ephemeralKey;
            jktJwtData = {
              header,
              payload,
              raw: jwtValue.jwt,
              identityKey,
              identityThumbprint
            };
          } else if (signatureKey.type === "jwks_uri") {
            const jwksUriValue = signatureKey.value;
            const { id, kid, dwk } = jwksUriValue;
            publicJwk = await getPublicKeyFromJWKS(id, kid, dwk, jwksCacheTtl);
            jwksUriData = { id, kid, dwk };
          } else {
            throw new Error(`Unsupported signature key type: ${signatureKey.type}`);
          }
          (0, crypto_js_1.validateJwk)(publicJwk);
          if (!accepted.includes(publicJwk.alg)) {
            throw (0, errors_js_1.unsupportedAlgorithm)(`Algorithm "${publicJwk.alg}" is not accepted by this verifier`, [...accepted]);
          }
          const signatureHeader = headers.get("signature");
          if (!signatureHeader) {
            throw new Error("Missing Signature header");
          }
          const signatures = (0, signature_js_1.parseSignature)(signatureHeader);
          const signature = signatures.get(label);
          if (!signature) {
            throw new Error(`No signature found for label: ${label}`);
          }
          const queryString = request.query ? `?${request.query}` : "";
          const targetUri = `https://${request.authority}${request.path}${queryString}`;
          const componentValues = /* @__PURE__ */ new Map();
          componentValues.set("@method", request.method.toUpperCase());
          componentValues.set("@target-uri", targetUri);
          componentValues.set("@authority", request.authority);
          componentValues.set("@scheme", "https");
          componentValues.set("@request-target", `${request.path}${queryString}`);
          componentValues.set("@path", request.path);
          componentValues.set("@query", request.query || "");
          if (request.body !== void 0 && components.includes("content-digest")) {
            const expectedDigest = headers.get("content-digest");
            if (!expectedDigest) {
              throw new Error("content-digest component specified but header missing");
            }
            const { generateContentDigest } = await Promise.resolve().then(() => __importStar(require_signature()));
            const actualDigest = await generateContentDigest(request.body);
            if (actualDigest !== expectedDigest) {
              throw new Error("content-digest does not match body");
            }
          }
          for (const component of components) {
            if (component.startsWith("@")) {
              continue;
            }
            const value = headers.get(component);
            if (value === void 0) {
              throw new Error(`Missing header for component: ${component}`);
            }
            componentValues.set(component, value);
          }
          const componentList = components.map((c) => `"${c}"`).join(" ");
          const paramPairs = Object.entries(params).map(([key, value]) => {
            if (typeof value === "number") {
              return `${key}=${value}`;
            }
            const stringValue = String(value);
            if (stringValue.startsWith('"') && stringValue.endsWith('"')) {
              return `${key}=${stringValue}`;
            }
            return `${key}="${stringValue}"`;
          }).join(";");
          const signatureParams = `(${componentList});${paramPairs}`;
          componentValues.set("@signature-params", signatureParams);
          const componentsWithParams = [...components, "@signature-params"];
          const signatureBase = (0, signature_js_1.generateSignatureBase)(componentsWithParams, componentValues);
          const signatureBaseBytes = new TextEncoder().encode(signatureBase);
          const thumbprint = await (0, thumbprint_js_1.calculateThumbprint)(publicJwk);
          const publicKey = await (0, crypto_js_1.importPublicKey)(publicJwk);
          const algorithm = (0, crypto_js_1.getAlgorithmFromJwk)(publicJwk);
          const isValid = await (0, crypto_js_1.verify)(signatureBaseBytes, signature, publicKey, algorithm);
          const result = {
            verified: isValid,
            label,
            keyType: signatureKey.type,
            publicKey: publicJwk,
            thumbprint,
            created: params.created
          };
          if (jwtData) {
            result.jwt = jwtData;
          }
          if (jktJwtData) {
            result.jkt_jwt = jktJwtData;
          }
          if (jwksUriData) {
            result.jwks_uri = jwksUriData;
          }
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            verified: false,
            label: "",
            keyType: "hwk",
            publicKey: {},
            thumbprint: "",
            created: 0,
            error: errorMessage,
            signatureError: toSignatureError(error),
            ...error instanceof errors_js_1.SignatureVerificationError && error.supportedAlgorithms ? { acceptSignatureAlg: error.supportedAlgorithms } : {}
          };
        }
      }
    }
  });

  // node_modules/@hellocoop/httpsig/dist/helpers.js
  var require_helpers = __commonJS({
    "node_modules/@hellocoop/httpsig/dist/helpers.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.expressVerify = expressVerify;
      exports.fastifyVerify = fastifyVerify;
      exports.nextJsVerify = nextJsVerify;
      exports.nextJsPagesVerify = nextJsPagesVerify;
      var verify_js_1 = require_verify();
      async function expressVerify(req, authority, options) {
        const urlObj = new URL(req.originalUrl, `${req.protocol}://${req.hostname}`);
        return (0, verify_js_1.verify)({
          method: req.method,
          authority,
          path: urlObj.pathname,
          query: urlObj.search ? urlObj.search.substring(1) : void 0,
          headers: req.headers,
          body: req.body
        }, options);
      }
      async function fastifyVerify(request, authority, options) {
        const urlObj = new URL(request.url, `${request.protocol}://${request.hostname}`);
        return (0, verify_js_1.verify)({
          method: request.method,
          authority,
          path: urlObj.pathname,
          query: urlObj.search ? urlObj.search.substring(1) : void 0,
          headers: request.headers,
          body: request.rawBody
        }, options);
      }
      async function nextJsVerify(request, authority, body, options) {
        const urlObj = new URL(request.url);
        return (0, verify_js_1.verify)({
          method: request.method,
          authority,
          path: urlObj.pathname,
          query: urlObj.search ? urlObj.search.substring(1) : void 0,
          headers: request.headers,
          body
        }, options);
      }
      async function nextJsPagesVerify(req, authority, body, options) {
        const reqUrl = req.url || "/";
        const urlObj = new URL(reqUrl, `https://${authority}`);
        return (0, verify_js_1.verify)({
          method: req.method || "GET",
          authority,
          path: urlObj.pathname,
          query: urlObj.search ? urlObj.search.substring(1) : void 0,
          headers: req.headers,
          body
        }, options);
      }
    }
  });

  // node_modules/@hellocoop/httpsig/dist/index.js
  var require_dist = __commonJS({
    "node_modules/@hellocoop/httpsig/dist/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.DEFAULT_COMPONENTS_BODY = exports.DEFAULT_COMPONENTS_GET = exports.VALID_DERIVED_COMPONENTS = exports.calculateThumbprint = exports.SignatureVerificationError = exports.SUPPORTED_ALGORITHMS = exports.determineAlgorithm = exports.generateKeyPair = exports.parseAcceptSignatureAlg = exports.generateAcceptSignatureAlgHeader = exports.parseAcceptSignatureScheme = exports.generateAcceptSignatureSchemeHeader = exports.parseAcceptSignature = exports.generateAcceptSignatureHeader = exports.parseSignatureError = exports.generateSignatureErrorHeader = exports.nextJsPagesVerify = exports.nextJsVerify = exports.fastifyVerify = exports.expressVerify = exports.verify = void 0;
      var fetch_js_1 = require_fetch();
      Object.defineProperty(exports, "fetch", { enumerable: true, get: function() {
        return fetch_js_1.fetch;
      } });
      var verify_js_1 = require_verify();
      Object.defineProperty(exports, "verify", { enumerable: true, get: function() {
        return verify_js_1.verify;
      } });
      var helpers_js_1 = require_helpers();
      Object.defineProperty(exports, "expressVerify", { enumerable: true, get: function() {
        return helpers_js_1.expressVerify;
      } });
      Object.defineProperty(exports, "fastifyVerify", { enumerable: true, get: function() {
        return helpers_js_1.fastifyVerify;
      } });
      Object.defineProperty(exports, "nextJsVerify", { enumerable: true, get: function() {
        return helpers_js_1.nextJsVerify;
      } });
      Object.defineProperty(exports, "nextJsPagesVerify", { enumerable: true, get: function() {
        return helpers_js_1.nextJsPagesVerify;
      } });
      var signature_js_1 = require_signature();
      Object.defineProperty(exports, "generateSignatureErrorHeader", { enumerable: true, get: function() {
        return signature_js_1.generateSignatureErrorHeader;
      } });
      Object.defineProperty(exports, "parseSignatureError", { enumerable: true, get: function() {
        return signature_js_1.parseSignatureError;
      } });
      Object.defineProperty(exports, "generateAcceptSignatureHeader", { enumerable: true, get: function() {
        return signature_js_1.generateAcceptSignatureHeader;
      } });
      Object.defineProperty(exports, "parseAcceptSignature", { enumerable: true, get: function() {
        return signature_js_1.parseAcceptSignature;
      } });
      Object.defineProperty(exports, "generateAcceptSignatureSchemeHeader", { enumerable: true, get: function() {
        return signature_js_1.generateAcceptSignatureSchemeHeader;
      } });
      Object.defineProperty(exports, "parseAcceptSignatureScheme", { enumerable: true, get: function() {
        return signature_js_1.parseAcceptSignatureScheme;
      } });
      Object.defineProperty(exports, "generateAcceptSignatureAlgHeader", { enumerable: true, get: function() {
        return signature_js_1.generateAcceptSignatureAlgHeader;
      } });
      Object.defineProperty(exports, "parseAcceptSignatureAlg", { enumerable: true, get: function() {
        return signature_js_1.parseAcceptSignatureAlg;
      } });
      var crypto_js_1 = require_crypto();
      Object.defineProperty(exports, "generateKeyPair", { enumerable: true, get: function() {
        return crypto_js_1.generateKeyPair;
      } });
      Object.defineProperty(exports, "determineAlgorithm", { enumerable: true, get: function() {
        return crypto_js_1.determineAlgorithm;
      } });
      Object.defineProperty(exports, "SUPPORTED_ALGORITHMS", { enumerable: true, get: function() {
        return crypto_js_1.SUPPORTED_ALGORITHMS;
      } });
      var errors_js_1 = require_errors();
      Object.defineProperty(exports, "SignatureVerificationError", { enumerable: true, get: function() {
        return errors_js_1.SignatureVerificationError;
      } });
      var thumbprint_js_1 = require_thumbprint();
      Object.defineProperty(exports, "calculateThumbprint", { enumerable: true, get: function() {
        return thumbprint_js_1.calculateThumbprint;
      } });
      var types_js_1 = require_types();
      Object.defineProperty(exports, "VALID_DERIVED_COMPONENTS", { enumerable: true, get: function() {
        return types_js_1.VALID_DERIVED_COMPONENTS;
      } });
      Object.defineProperty(exports, "DEFAULT_COMPONENTS_GET", { enumerable: true, get: function() {
        return types_js_1.DEFAULT_COMPONENTS_GET;
      } });
      Object.defineProperty(exports, "DEFAULT_COMPONENTS_BODY", { enumerable: true, get: function() {
        return types_js_1.DEFAULT_COMPONENTS_BODY;
      } });
    }
  });

  // client/protocol.js
  var import_httpsig = __toESM(require_dist());

  // node_modules/qrcode-generator/dist/qrcode.mjs
  var qrcode = function(typeNumber, errorCorrectionLevel) {
    const PAD0 = 236;
    const PAD1 = 17;
    let _typeNumber = typeNumber;
    const _errorCorrectionLevel = QRErrorCorrectionLevel[errorCorrectionLevel];
    let _modules = null;
    let _moduleCount = 0;
    let _dataCache = null;
    const _dataList = [];
    const _this = {};
    const makeImpl = function(test, maskPattern) {
      _moduleCount = _typeNumber * 4 + 17;
      _modules = (function(moduleCount) {
        const modules = new Array(moduleCount);
        for (let row = 0; row < moduleCount; row += 1) {
          modules[row] = new Array(moduleCount);
          for (let col = 0; col < moduleCount; col += 1) {
            modules[row][col] = null;
          }
        }
        return modules;
      })(_moduleCount);
      setupPositionProbePattern(0, 0);
      setupPositionProbePattern(_moduleCount - 7, 0);
      setupPositionProbePattern(0, _moduleCount - 7);
      setupPositionAdjustPattern();
      setupTimingPattern();
      setupTypeInfo(test, maskPattern);
      if (_typeNumber >= 7) {
        setupTypeNumber(test);
      }
      if (_dataCache == null) {
        _dataCache = createData(_typeNumber, _errorCorrectionLevel, _dataList);
      }
      mapData(_dataCache, maskPattern);
    };
    const setupPositionProbePattern = function(row, col) {
      for (let r = -1; r <= 7; r += 1) {
        if (row + r <= -1 || _moduleCount <= row + r) continue;
        for (let c = -1; c <= 7; c += 1) {
          if (col + c <= -1 || _moduleCount <= col + c) continue;
          if (0 <= r && r <= 6 && (c == 0 || c == 6) || 0 <= c && c <= 6 && (r == 0 || r == 6) || 2 <= r && r <= 4 && 2 <= c && c <= 4) {
            _modules[row + r][col + c] = true;
          } else {
            _modules[row + r][col + c] = false;
          }
        }
      }
    };
    const getBestMaskPattern = function() {
      let minLostPoint = 0;
      let pattern = 0;
      for (let i = 0; i < 8; i += 1) {
        makeImpl(true, i);
        const lostPoint = QRUtil.getLostPoint(_this);
        if (i == 0 || minLostPoint > lostPoint) {
          minLostPoint = lostPoint;
          pattern = i;
        }
      }
      return pattern;
    };
    const setupTimingPattern = function() {
      for (let r = 8; r < _moduleCount - 8; r += 1) {
        if (_modules[r][6] != null) {
          continue;
        }
        _modules[r][6] = r % 2 == 0;
      }
      for (let c = 8; c < _moduleCount - 8; c += 1) {
        if (_modules[6][c] != null) {
          continue;
        }
        _modules[6][c] = c % 2 == 0;
      }
    };
    const setupPositionAdjustPattern = function() {
      const pos = QRUtil.getPatternPosition(_typeNumber);
      for (let i = 0; i < pos.length; i += 1) {
        for (let j = 0; j < pos.length; j += 1) {
          const row = pos[i];
          const col = pos[j];
          if (_modules[row][col] != null) {
            continue;
          }
          for (let r = -2; r <= 2; r += 1) {
            for (let c = -2; c <= 2; c += 1) {
              if (r == -2 || r == 2 || c == -2 || c == 2 || r == 0 && c == 0) {
                _modules[row + r][col + c] = true;
              } else {
                _modules[row + r][col + c] = false;
              }
            }
          }
        }
      }
    };
    const setupTypeNumber = function(test) {
      const bits = QRUtil.getBCHTypeNumber(_typeNumber);
      for (let i = 0; i < 18; i += 1) {
        const mod = !test && (bits >> i & 1) == 1;
        _modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = mod;
      }
      for (let i = 0; i < 18; i += 1) {
        const mod = !test && (bits >> i & 1) == 1;
        _modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
      }
    };
    const setupTypeInfo = function(test, maskPattern) {
      const data = _errorCorrectionLevel << 3 | maskPattern;
      const bits = QRUtil.getBCHTypeInfo(data);
      for (let i = 0; i < 15; i += 1) {
        const mod = !test && (bits >> i & 1) == 1;
        if (i < 6) {
          _modules[i][8] = mod;
        } else if (i < 8) {
          _modules[i + 1][8] = mod;
        } else {
          _modules[_moduleCount - 15 + i][8] = mod;
        }
      }
      for (let i = 0; i < 15; i += 1) {
        const mod = !test && (bits >> i & 1) == 1;
        if (i < 8) {
          _modules[8][_moduleCount - i - 1] = mod;
        } else if (i < 9) {
          _modules[8][15 - i - 1 + 1] = mod;
        } else {
          _modules[8][15 - i - 1] = mod;
        }
      }
      _modules[_moduleCount - 8][8] = !test;
    };
    const mapData = function(data, maskPattern) {
      let inc = -1;
      let row = _moduleCount - 1;
      let bitIndex = 7;
      let byteIndex = 0;
      const maskFunc = QRUtil.getMaskFunction(maskPattern);
      for (let col = _moduleCount - 1; col > 0; col -= 2) {
        if (col == 6) col -= 1;
        while (true) {
          for (let c = 0; c < 2; c += 1) {
            if (_modules[row][col - c] == null) {
              let dark = false;
              if (byteIndex < data.length) {
                dark = (data[byteIndex] >>> bitIndex & 1) == 1;
              }
              const mask = maskFunc(row, col - c);
              if (mask) {
                dark = !dark;
              }
              _modules[row][col - c] = dark;
              bitIndex -= 1;
              if (bitIndex == -1) {
                byteIndex += 1;
                bitIndex = 7;
              }
            }
          }
          row += inc;
          if (row < 0 || _moduleCount <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    };
    const createBytes = function(buffer, rsBlocks) {
      let offset = 0;
      let maxDcCount = 0;
      let maxEcCount = 0;
      const dcdata = new Array(rsBlocks.length);
      const ecdata = new Array(rsBlocks.length);
      for (let r = 0; r < rsBlocks.length; r += 1) {
        const dcCount = rsBlocks[r].dataCount;
        const ecCount = rsBlocks[r].totalCount - dcCount;
        maxDcCount = Math.max(maxDcCount, dcCount);
        maxEcCount = Math.max(maxEcCount, ecCount);
        dcdata[r] = new Array(dcCount);
        for (let i = 0; i < dcdata[r].length; i += 1) {
          dcdata[r][i] = 255 & buffer.getBuffer()[i + offset];
        }
        offset += dcCount;
        const rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
        const rawPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1);
        const modPoly = rawPoly.mod(rsPoly);
        ecdata[r] = new Array(rsPoly.getLength() - 1);
        for (let i = 0; i < ecdata[r].length; i += 1) {
          const modIndex = i + modPoly.getLength() - ecdata[r].length;
          ecdata[r][i] = modIndex >= 0 ? modPoly.getAt(modIndex) : 0;
        }
      }
      let totalCodeCount = 0;
      for (let i = 0; i < rsBlocks.length; i += 1) {
        totalCodeCount += rsBlocks[i].totalCount;
      }
      const data = new Array(totalCodeCount);
      let index = 0;
      for (let i = 0; i < maxDcCount; i += 1) {
        for (let r = 0; r < rsBlocks.length; r += 1) {
          if (i < dcdata[r].length) {
            data[index] = dcdata[r][i];
            index += 1;
          }
        }
      }
      for (let i = 0; i < maxEcCount; i += 1) {
        for (let r = 0; r < rsBlocks.length; r += 1) {
          if (i < ecdata[r].length) {
            data[index] = ecdata[r][i];
            index += 1;
          }
        }
      }
      return data;
    };
    const createData = function(typeNumber2, errorCorrectionLevel2, dataList) {
      const rsBlocks = QRRSBlock.getRSBlocks(typeNumber2, errorCorrectionLevel2);
      const buffer = qrBitBuffer();
      for (let i = 0; i < dataList.length; i += 1) {
        const data = dataList[i];
        buffer.put(data.getMode(), 4);
        buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber2));
        data.write(buffer);
      }
      let totalDataCount = 0;
      for (let i = 0; i < rsBlocks.length; i += 1) {
        totalDataCount += rsBlocks[i].dataCount;
      }
      if (buffer.getLengthInBits() > totalDataCount * 8) {
        throw "code length overflow. (" + buffer.getLengthInBits() + ">" + totalDataCount * 8 + ")";
      }
      if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
        buffer.put(0, 4);
      }
      while (buffer.getLengthInBits() % 8 != 0) {
        buffer.putBit(false);
      }
      while (true) {
        if (buffer.getLengthInBits() >= totalDataCount * 8) {
          break;
        }
        buffer.put(PAD0, 8);
        if (buffer.getLengthInBits() >= totalDataCount * 8) {
          break;
        }
        buffer.put(PAD1, 8);
      }
      return createBytes(buffer, rsBlocks);
    };
    _this.addData = function(data, mode) {
      mode = mode || "Byte";
      let newData = null;
      switch (mode) {
        case "Numeric":
          newData = qrNumber(data);
          break;
        case "Alphanumeric":
          newData = qrAlphaNum(data);
          break;
        case "Byte":
          newData = qr8BitByte(data);
          break;
        case "Kanji":
          newData = qrKanji(data);
          break;
        default:
          throw "mode:" + mode;
      }
      _dataList.push(newData);
      _dataCache = null;
    };
    _this.isDark = function(row, col) {
      if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) {
        throw row + "," + col;
      }
      return _modules[row][col];
    };
    _this.getModuleCount = function() {
      return _moduleCount;
    };
    _this.make = function() {
      if (_typeNumber < 1) {
        let typeNumber2 = 1;
        for (; typeNumber2 < 40; typeNumber2++) {
          const rsBlocks = QRRSBlock.getRSBlocks(typeNumber2, _errorCorrectionLevel);
          const buffer = qrBitBuffer();
          for (let i = 0; i < _dataList.length; i++) {
            const data = _dataList[i];
            buffer.put(data.getMode(), 4);
            buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber2));
            data.write(buffer);
          }
          let totalDataCount = 0;
          for (let i = 0; i < rsBlocks.length; i++) {
            totalDataCount += rsBlocks[i].dataCount;
          }
          if (buffer.getLengthInBits() <= totalDataCount * 8) {
            break;
          }
        }
        _typeNumber = typeNumber2;
      }
      makeImpl(false, getBestMaskPattern());
    };
    _this.createTableTag = function(cellSize, margin) {
      cellSize = cellSize || 2;
      margin = typeof margin == "undefined" ? cellSize * 4 : margin;
      let qrHtml = "";
      qrHtml += '<table style="';
      qrHtml += " border-width: 0px; border-style: none;";
      qrHtml += " border-collapse: collapse;";
      qrHtml += " padding: 0px; margin: " + margin + "px;";
      qrHtml += '">';
      qrHtml += "<tbody>";
      for (let r = 0; r < _this.getModuleCount(); r += 1) {
        qrHtml += "<tr>";
        for (let c = 0; c < _this.getModuleCount(); c += 1) {
          qrHtml += '<td style="';
          qrHtml += " border-width: 0px; border-style: none;";
          qrHtml += " border-collapse: collapse;";
          qrHtml += " padding: 0px; margin: 0px;";
          qrHtml += " width: " + cellSize + "px;";
          qrHtml += " height: " + cellSize + "px;";
          qrHtml += " background-color: ";
          qrHtml += _this.isDark(r, c) ? "#000000" : "#ffffff";
          qrHtml += ";";
          qrHtml += '"/>';
        }
        qrHtml += "</tr>";
      }
      qrHtml += "</tbody>";
      qrHtml += "</table>";
      return qrHtml;
    };
    _this.createSvgTag = function(cellSize, margin, alt, title) {
      let opts = {};
      if (typeof arguments[0] == "object") {
        opts = arguments[0];
        cellSize = opts.cellSize;
        margin = opts.margin;
        alt = opts.alt;
        title = opts.title;
      }
      cellSize = cellSize || 2;
      margin = typeof margin == "undefined" ? cellSize * 4 : margin;
      alt = typeof alt === "string" ? { text: alt } : alt || {};
      alt.text = alt.text || null;
      alt.id = alt.text ? alt.id || "qrcode-description" : null;
      title = typeof title === "string" ? { text: title } : title || {};
      title.text = title.text || null;
      title.id = title.text ? title.id || "qrcode-title" : null;
      const size = _this.getModuleCount() * cellSize + margin * 2;
      let c, mc, r, mr, qrSvg = "", rect;
      rect = "l" + cellSize + ",0 0," + cellSize + " -" + cellSize + ",0 0,-" + cellSize + "z ";
      qrSvg += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"';
      qrSvg += !opts.scalable ? ' width="' + size + 'px" height="' + size + 'px"' : "";
      qrSvg += ' viewBox="0 0 ' + size + " " + size + '" ';
      qrSvg += ' preserveAspectRatio="xMinYMin meet"';
      qrSvg += title.text || alt.text ? ' role="img" aria-labelledby="' + escapeXml([title.id, alt.id].join(" ").trim()) + '"' : "";
      qrSvg += ">";
      qrSvg += title.text ? '<title id="' + escapeXml(title.id) + '">' + escapeXml(title.text) + "</title>" : "";
      qrSvg += alt.text ? '<description id="' + escapeXml(alt.id) + '">' + escapeXml(alt.text) + "</description>" : "";
      qrSvg += '<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>';
      qrSvg += '<path d="';
      for (r = 0; r < _this.getModuleCount(); r += 1) {
        mr = r * cellSize + margin;
        for (c = 0; c < _this.getModuleCount(); c += 1) {
          if (_this.isDark(r, c)) {
            mc = c * cellSize + margin;
            qrSvg += "M" + mc + "," + mr + rect;
          }
        }
      }
      qrSvg += '" stroke="transparent" fill="black"/>';
      qrSvg += "</svg>";
      return qrSvg;
    };
    _this.createDataURL = function(cellSize, margin) {
      cellSize = cellSize || 2;
      margin = typeof margin == "undefined" ? cellSize * 4 : margin;
      const size = _this.getModuleCount() * cellSize + margin * 2;
      const min = margin;
      const max = size - margin;
      return createDataURL(size, size, function(x, y) {
        if (min <= x && x < max && min <= y && y < max) {
          const c = Math.floor((x - min) / cellSize);
          const r = Math.floor((y - min) / cellSize);
          return _this.isDark(r, c) ? 0 : 1;
        } else {
          return 1;
        }
      });
    };
    _this.createImgTag = function(cellSize, margin, alt) {
      cellSize = cellSize || 2;
      margin = typeof margin == "undefined" ? cellSize * 4 : margin;
      const size = _this.getModuleCount() * cellSize + margin * 2;
      let img = "";
      img += "<img";
      img += ' src="';
      img += _this.createDataURL(cellSize, margin);
      img += '"';
      img += ' width="';
      img += size;
      img += '"';
      img += ' height="';
      img += size;
      img += '"';
      if (alt) {
        img += ' alt="';
        img += escapeXml(alt);
        img += '"';
      }
      img += "/>";
      return img;
    };
    const escapeXml = function(s) {
      let escaped = "";
      for (let i = 0; i < s.length; i += 1) {
        const c = s.charAt(i);
        switch (c) {
          case "<":
            escaped += "&lt;";
            break;
          case ">":
            escaped += "&gt;";
            break;
          case "&":
            escaped += "&amp;";
            break;
          case '"':
            escaped += "&quot;";
            break;
          default:
            escaped += c;
            break;
        }
      }
      return escaped;
    };
    const _createHalfASCII = function(margin) {
      const cellSize = 1;
      margin = typeof margin == "undefined" ? cellSize * 2 : margin;
      const size = _this.getModuleCount() * cellSize + margin * 2;
      const min = margin;
      const max = size - margin;
      let y, x, r1, r2, p;
      const blocks = {
        "\u2588\u2588": "\u2588",
        "\u2588 ": "\u2580",
        " \u2588": "\u2584",
        "  ": " "
      };
      const blocksLastLineNoMargin = {
        "\u2588\u2588": "\u2580",
        "\u2588 ": "\u2580",
        " \u2588": " ",
        "  ": " "
      };
      let ascii = "";
      for (y = 0; y < size; y += 2) {
        r1 = Math.floor((y - min) / cellSize);
        r2 = Math.floor((y + 1 - min) / cellSize);
        for (x = 0; x < size; x += 1) {
          p = "\u2588";
          if (min <= x && x < max && min <= y && y < max && _this.isDark(r1, Math.floor((x - min) / cellSize))) {
            p = " ";
          }
          if (min <= x && x < max && min <= y + 1 && y + 1 < max && _this.isDark(r2, Math.floor((x - min) / cellSize))) {
            p += " ";
          } else {
            p += "\u2588";
          }
          ascii += margin < 1 && y + 1 >= max ? blocksLastLineNoMargin[p] : blocks[p];
        }
        ascii += "\n";
      }
      if (size % 2 && margin > 0) {
        return ascii.substring(0, ascii.length - size - 1) + Array(size + 1).join("\u2580");
      }
      return ascii.substring(0, ascii.length - 1);
    };
    _this.createASCII = function(cellSize, margin) {
      cellSize = cellSize || 1;
      if (cellSize < 2) {
        return _createHalfASCII(margin);
      }
      cellSize -= 1;
      margin = typeof margin == "undefined" ? cellSize * 2 : margin;
      const size = _this.getModuleCount() * cellSize + margin * 2;
      const min = margin;
      const max = size - margin;
      let y, x, r, p;
      const white = Array(cellSize + 1).join("\u2588\u2588");
      const black = Array(cellSize + 1).join("  ");
      let ascii = "";
      let line = "";
      for (y = 0; y < size; y += 1) {
        r = Math.floor((y - min) / cellSize);
        line = "";
        for (x = 0; x < size; x += 1) {
          p = 1;
          if (min <= x && x < max && min <= y && y < max && _this.isDark(r, Math.floor((x - min) / cellSize))) {
            p = 0;
          }
          line += p ? white : black;
        }
        for (r = 0; r < cellSize; r += 1) {
          ascii += line + "\n";
        }
      }
      return ascii.substring(0, ascii.length - 1);
    };
    _this.renderTo2dContext = function(context, cellSize) {
      cellSize = cellSize || 2;
      const length = _this.getModuleCount();
      for (let row = 0; row < length; row++) {
        for (let col = 0; col < length; col++) {
          context.fillStyle = _this.isDark(row, col) ? "black" : "white";
          context.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    };
    return _this;
  };
  qrcode.stringToBytes = function(s) {
    const bytes = [];
    for (let i = 0; i < s.length; i += 1) {
      const c = s.charCodeAt(i);
      bytes.push(c & 255);
    }
    return bytes;
  };
  qrcode.createStringToBytes = function(unicodeData, numChars) {
    const unicodeMap = (function() {
      const bin = base64DecodeInputStream(unicodeData);
      const read = function() {
        const b = bin.read();
        if (b == -1) throw "eof";
        return b;
      };
      let count = 0;
      const unicodeMap2 = {};
      while (true) {
        const b0 = bin.read();
        if (b0 == -1) break;
        const b1 = read();
        const b2 = read();
        const b3 = read();
        const k = String.fromCharCode(b0 << 8 | b1);
        const v = b2 << 8 | b3;
        unicodeMap2[k] = v;
        count += 1;
      }
      if (count != numChars) {
        throw count + " != " + numChars;
      }
      return unicodeMap2;
    })();
    const unknownChar = "?".charCodeAt(0);
    return function(s) {
      const bytes = [];
      for (let i = 0; i < s.length; i += 1) {
        const c = s.charCodeAt(i);
        if (c < 128) {
          bytes.push(c);
        } else {
          const b = unicodeMap[s.charAt(i)];
          if (typeof b == "number") {
            if ((b & 255) == b) {
              bytes.push(b);
            } else {
              bytes.push(b >>> 8);
              bytes.push(b & 255);
            }
          } else {
            bytes.push(unknownChar);
          }
        }
      }
      return bytes;
    };
  };
  var QRMode = {
    MODE_NUMBER: 1 << 0,
    MODE_ALPHA_NUM: 1 << 1,
    MODE_8BIT_BYTE: 1 << 2,
    MODE_KANJI: 1 << 3
  };
  var QRErrorCorrectionLevel = {
    L: 1,
    M: 0,
    Q: 3,
    H: 2
  };
  var QRMaskPattern = {
    PATTERN000: 0,
    PATTERN001: 1,
    PATTERN010: 2,
    PATTERN011: 3,
    PATTERN100: 4,
    PATTERN101: 5,
    PATTERN110: 6,
    PATTERN111: 7
  };
  var QRUtil = (function() {
    const PATTERN_POSITION_TABLE = [
      [],
      [6, 18],
      [6, 22],
      [6, 26],
      [6, 30],
      [6, 34],
      [6, 22, 38],
      [6, 24, 42],
      [6, 26, 46],
      [6, 28, 50],
      [6, 30, 54],
      [6, 32, 58],
      [6, 34, 62],
      [6, 26, 46, 66],
      [6, 26, 48, 70],
      [6, 26, 50, 74],
      [6, 30, 54, 78],
      [6, 30, 56, 82],
      [6, 30, 58, 86],
      [6, 34, 62, 90],
      [6, 28, 50, 72, 94],
      [6, 26, 50, 74, 98],
      [6, 30, 54, 78, 102],
      [6, 28, 54, 80, 106],
      [6, 32, 58, 84, 110],
      [6, 30, 58, 86, 114],
      [6, 34, 62, 90, 118],
      [6, 26, 50, 74, 98, 122],
      [6, 30, 54, 78, 102, 126],
      [6, 26, 52, 78, 104, 130],
      [6, 30, 56, 82, 108, 134],
      [6, 34, 60, 86, 112, 138],
      [6, 30, 58, 86, 114, 142],
      [6, 34, 62, 90, 118, 146],
      [6, 30, 54, 78, 102, 126, 150],
      [6, 24, 50, 76, 102, 128, 154],
      [6, 28, 54, 80, 106, 132, 158],
      [6, 32, 58, 84, 110, 136, 162],
      [6, 26, 54, 82, 110, 138, 166],
      [6, 30, 58, 86, 114, 142, 170]
    ];
    const G15 = 1 << 10 | 1 << 8 | 1 << 5 | 1 << 4 | 1 << 2 | 1 << 1 | 1 << 0;
    const G18 = 1 << 12 | 1 << 11 | 1 << 10 | 1 << 9 | 1 << 8 | 1 << 5 | 1 << 2 | 1 << 0;
    const G15_MASK = 1 << 14 | 1 << 12 | 1 << 10 | 1 << 4 | 1 << 1;
    const _this = {};
    const getBCHDigit = function(data) {
      let digit = 0;
      while (data != 0) {
        digit += 1;
        data >>>= 1;
      }
      return digit;
    };
    _this.getBCHTypeInfo = function(data) {
      let d = data << 10;
      while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
        d ^= G15 << getBCHDigit(d) - getBCHDigit(G15);
      }
      return (data << 10 | d) ^ G15_MASK;
    };
    _this.getBCHTypeNumber = function(data) {
      let d = data << 12;
      while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
        d ^= G18 << getBCHDigit(d) - getBCHDigit(G18);
      }
      return data << 12 | d;
    };
    _this.getPatternPosition = function(typeNumber) {
      return PATTERN_POSITION_TABLE[typeNumber - 1];
    };
    _this.getMaskFunction = function(maskPattern) {
      switch (maskPattern) {
        case QRMaskPattern.PATTERN000:
          return function(i, j) {
            return (i + j) % 2 == 0;
          };
        case QRMaskPattern.PATTERN001:
          return function(i, j) {
            return i % 2 == 0;
          };
        case QRMaskPattern.PATTERN010:
          return function(i, j) {
            return j % 3 == 0;
          };
        case QRMaskPattern.PATTERN011:
          return function(i, j) {
            return (i + j) % 3 == 0;
          };
        case QRMaskPattern.PATTERN100:
          return function(i, j) {
            return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0;
          };
        case QRMaskPattern.PATTERN101:
          return function(i, j) {
            return i * j % 2 + i * j % 3 == 0;
          };
        case QRMaskPattern.PATTERN110:
          return function(i, j) {
            return (i * j % 2 + i * j % 3) % 2 == 0;
          };
        case QRMaskPattern.PATTERN111:
          return function(i, j) {
            return (i * j % 3 + (i + j) % 2) % 2 == 0;
          };
        default:
          throw "bad maskPattern:" + maskPattern;
      }
    };
    _this.getErrorCorrectPolynomial = function(errorCorrectLength) {
      let a = qrPolynomial([1], 0);
      for (let i = 0; i < errorCorrectLength; i += 1) {
        a = a.multiply(qrPolynomial([1, QRMath.gexp(i)], 0));
      }
      return a;
    };
    _this.getLengthInBits = function(mode, type) {
      if (1 <= type && type < 10) {
        switch (mode) {
          case QRMode.MODE_NUMBER:
            return 10;
          case QRMode.MODE_ALPHA_NUM:
            return 9;
          case QRMode.MODE_8BIT_BYTE:
            return 8;
          case QRMode.MODE_KANJI:
            return 8;
          default:
            throw "mode:" + mode;
        }
      } else if (type < 27) {
        switch (mode) {
          case QRMode.MODE_NUMBER:
            return 12;
          case QRMode.MODE_ALPHA_NUM:
            return 11;
          case QRMode.MODE_8BIT_BYTE:
            return 16;
          case QRMode.MODE_KANJI:
            return 10;
          default:
            throw "mode:" + mode;
        }
      } else if (type < 41) {
        switch (mode) {
          case QRMode.MODE_NUMBER:
            return 14;
          case QRMode.MODE_ALPHA_NUM:
            return 13;
          case QRMode.MODE_8BIT_BYTE:
            return 16;
          case QRMode.MODE_KANJI:
            return 12;
          default:
            throw "mode:" + mode;
        }
      } else {
        throw "type:" + type;
      }
    };
    _this.getLostPoint = function(qrcode2) {
      const moduleCount = qrcode2.getModuleCount();
      let lostPoint = 0;
      for (let row = 0; row < moduleCount; row += 1) {
        for (let col = 0; col < moduleCount; col += 1) {
          let sameCount = 0;
          const dark = qrcode2.isDark(row, col);
          for (let r = -1; r <= 1; r += 1) {
            if (row + r < 0 || moduleCount <= row + r) {
              continue;
            }
            for (let c = -1; c <= 1; c += 1) {
              if (col + c < 0 || moduleCount <= col + c) {
                continue;
              }
              if (r == 0 && c == 0) {
                continue;
              }
              if (dark == qrcode2.isDark(row + r, col + c)) {
                sameCount += 1;
              }
            }
          }
          if (sameCount > 5) {
            lostPoint += 3 + sameCount - 5;
          }
        }
      }
      ;
      for (let row = 0; row < moduleCount - 1; row += 1) {
        for (let col = 0; col < moduleCount - 1; col += 1) {
          let count = 0;
          if (qrcode2.isDark(row, col)) count += 1;
          if (qrcode2.isDark(row + 1, col)) count += 1;
          if (qrcode2.isDark(row, col + 1)) count += 1;
          if (qrcode2.isDark(row + 1, col + 1)) count += 1;
          if (count == 0 || count == 4) {
            lostPoint += 3;
          }
        }
      }
      for (let row = 0; row < moduleCount; row += 1) {
        for (let col = 0; col < moduleCount - 6; col += 1) {
          if (qrcode2.isDark(row, col) && !qrcode2.isDark(row, col + 1) && qrcode2.isDark(row, col + 2) && qrcode2.isDark(row, col + 3) && qrcode2.isDark(row, col + 4) && !qrcode2.isDark(row, col + 5) && qrcode2.isDark(row, col + 6)) {
            lostPoint += 40;
          }
        }
      }
      for (let col = 0; col < moduleCount; col += 1) {
        for (let row = 0; row < moduleCount - 6; row += 1) {
          if (qrcode2.isDark(row, col) && !qrcode2.isDark(row + 1, col) && qrcode2.isDark(row + 2, col) && qrcode2.isDark(row + 3, col) && qrcode2.isDark(row + 4, col) && !qrcode2.isDark(row + 5, col) && qrcode2.isDark(row + 6, col)) {
            lostPoint += 40;
          }
        }
      }
      let darkCount = 0;
      for (let col = 0; col < moduleCount; col += 1) {
        for (let row = 0; row < moduleCount; row += 1) {
          if (qrcode2.isDark(row, col)) {
            darkCount += 1;
          }
        }
      }
      const ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
      lostPoint += ratio * 10;
      return lostPoint;
    };
    return _this;
  })();
  var QRMath = (function() {
    const EXP_TABLE = new Array(256);
    const LOG_TABLE = new Array(256);
    for (let i = 0; i < 8; i += 1) {
      EXP_TABLE[i] = 1 << i;
    }
    for (let i = 8; i < 256; i += 1) {
      EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8];
    }
    for (let i = 0; i < 255; i += 1) {
      LOG_TABLE[EXP_TABLE[i]] = i;
    }
    const _this = {};
    _this.glog = function(n) {
      if (n < 1) {
        throw "glog(" + n + ")";
      }
      return LOG_TABLE[n];
    };
    _this.gexp = function(n) {
      while (n < 0) {
        n += 255;
      }
      while (n >= 256) {
        n -= 255;
      }
      return EXP_TABLE[n];
    };
    return _this;
  })();
  var qrPolynomial = function(num, shift) {
    if (typeof num.length == "undefined") {
      throw num.length + "/" + shift;
    }
    const _num = (function() {
      let offset = 0;
      while (offset < num.length && num[offset] == 0) {
        offset += 1;
      }
      const _num2 = new Array(num.length - offset + shift);
      for (let i = 0; i < num.length - offset; i += 1) {
        _num2[i] = num[i + offset];
      }
      return _num2;
    })();
    const _this = {};
    _this.getAt = function(index) {
      return _num[index];
    };
    _this.getLength = function() {
      return _num.length;
    };
    _this.multiply = function(e) {
      const num2 = new Array(_this.getLength() + e.getLength() - 1);
      for (let i = 0; i < _this.getLength(); i += 1) {
        for (let j = 0; j < e.getLength(); j += 1) {
          num2[i + j] ^= QRMath.gexp(QRMath.glog(_this.getAt(i)) + QRMath.glog(e.getAt(j)));
        }
      }
      return qrPolynomial(num2, 0);
    };
    _this.mod = function(e) {
      if (_this.getLength() - e.getLength() < 0) {
        return _this;
      }
      const ratio = QRMath.glog(_this.getAt(0)) - QRMath.glog(e.getAt(0));
      const num2 = new Array(_this.getLength());
      for (let i = 0; i < _this.getLength(); i += 1) {
        num2[i] = _this.getAt(i);
      }
      for (let i = 0; i < e.getLength(); i += 1) {
        num2[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i)) + ratio);
      }
      return qrPolynomial(num2, 0).mod(e);
    };
    return _this;
  };
  var QRRSBlock = (function() {
    const RS_BLOCK_TABLE = [
      // L
      // M
      // Q
      // H
      // 1
      [1, 26, 19],
      [1, 26, 16],
      [1, 26, 13],
      [1, 26, 9],
      // 2
      [1, 44, 34],
      [1, 44, 28],
      [1, 44, 22],
      [1, 44, 16],
      // 3
      [1, 70, 55],
      [1, 70, 44],
      [2, 35, 17],
      [2, 35, 13],
      // 4
      [1, 100, 80],
      [2, 50, 32],
      [2, 50, 24],
      [4, 25, 9],
      // 5
      [1, 134, 108],
      [2, 67, 43],
      [2, 33, 15, 2, 34, 16],
      [2, 33, 11, 2, 34, 12],
      // 6
      [2, 86, 68],
      [4, 43, 27],
      [4, 43, 19],
      [4, 43, 15],
      // 7
      [2, 98, 78],
      [4, 49, 31],
      [2, 32, 14, 4, 33, 15],
      [4, 39, 13, 1, 40, 14],
      // 8
      [2, 121, 97],
      [2, 60, 38, 2, 61, 39],
      [4, 40, 18, 2, 41, 19],
      [4, 40, 14, 2, 41, 15],
      // 9
      [2, 146, 116],
      [3, 58, 36, 2, 59, 37],
      [4, 36, 16, 4, 37, 17],
      [4, 36, 12, 4, 37, 13],
      // 10
      [2, 86, 68, 2, 87, 69],
      [4, 69, 43, 1, 70, 44],
      [6, 43, 19, 2, 44, 20],
      [6, 43, 15, 2, 44, 16],
      // 11
      [4, 101, 81],
      [1, 80, 50, 4, 81, 51],
      [4, 50, 22, 4, 51, 23],
      [3, 36, 12, 8, 37, 13],
      // 12
      [2, 116, 92, 2, 117, 93],
      [6, 58, 36, 2, 59, 37],
      [4, 46, 20, 6, 47, 21],
      [7, 42, 14, 4, 43, 15],
      // 13
      [4, 133, 107],
      [8, 59, 37, 1, 60, 38],
      [8, 44, 20, 4, 45, 21],
      [12, 33, 11, 4, 34, 12],
      // 14
      [3, 145, 115, 1, 146, 116],
      [4, 64, 40, 5, 65, 41],
      [11, 36, 16, 5, 37, 17],
      [11, 36, 12, 5, 37, 13],
      // 15
      [5, 109, 87, 1, 110, 88],
      [5, 65, 41, 5, 66, 42],
      [5, 54, 24, 7, 55, 25],
      [11, 36, 12, 7, 37, 13],
      // 16
      [5, 122, 98, 1, 123, 99],
      [7, 73, 45, 3, 74, 46],
      [15, 43, 19, 2, 44, 20],
      [3, 45, 15, 13, 46, 16],
      // 17
      [1, 135, 107, 5, 136, 108],
      [10, 74, 46, 1, 75, 47],
      [1, 50, 22, 15, 51, 23],
      [2, 42, 14, 17, 43, 15],
      // 18
      [5, 150, 120, 1, 151, 121],
      [9, 69, 43, 4, 70, 44],
      [17, 50, 22, 1, 51, 23],
      [2, 42, 14, 19, 43, 15],
      // 19
      [3, 141, 113, 4, 142, 114],
      [3, 70, 44, 11, 71, 45],
      [17, 47, 21, 4, 48, 22],
      [9, 39, 13, 16, 40, 14],
      // 20
      [3, 135, 107, 5, 136, 108],
      [3, 67, 41, 13, 68, 42],
      [15, 54, 24, 5, 55, 25],
      [15, 43, 15, 10, 44, 16],
      // 21
      [4, 144, 116, 4, 145, 117],
      [17, 68, 42],
      [17, 50, 22, 6, 51, 23],
      [19, 46, 16, 6, 47, 17],
      // 22
      [2, 139, 111, 7, 140, 112],
      [17, 74, 46],
      [7, 54, 24, 16, 55, 25],
      [34, 37, 13],
      // 23
      [4, 151, 121, 5, 152, 122],
      [4, 75, 47, 14, 76, 48],
      [11, 54, 24, 14, 55, 25],
      [16, 45, 15, 14, 46, 16],
      // 24
      [6, 147, 117, 4, 148, 118],
      [6, 73, 45, 14, 74, 46],
      [11, 54, 24, 16, 55, 25],
      [30, 46, 16, 2, 47, 17],
      // 25
      [8, 132, 106, 4, 133, 107],
      [8, 75, 47, 13, 76, 48],
      [7, 54, 24, 22, 55, 25],
      [22, 45, 15, 13, 46, 16],
      // 26
      [10, 142, 114, 2, 143, 115],
      [19, 74, 46, 4, 75, 47],
      [28, 50, 22, 6, 51, 23],
      [33, 46, 16, 4, 47, 17],
      // 27
      [8, 152, 122, 4, 153, 123],
      [22, 73, 45, 3, 74, 46],
      [8, 53, 23, 26, 54, 24],
      [12, 45, 15, 28, 46, 16],
      // 28
      [3, 147, 117, 10, 148, 118],
      [3, 73, 45, 23, 74, 46],
      [4, 54, 24, 31, 55, 25],
      [11, 45, 15, 31, 46, 16],
      // 29
      [7, 146, 116, 7, 147, 117],
      [21, 73, 45, 7, 74, 46],
      [1, 53, 23, 37, 54, 24],
      [19, 45, 15, 26, 46, 16],
      // 30
      [5, 145, 115, 10, 146, 116],
      [19, 75, 47, 10, 76, 48],
      [15, 54, 24, 25, 55, 25],
      [23, 45, 15, 25, 46, 16],
      // 31
      [13, 145, 115, 3, 146, 116],
      [2, 74, 46, 29, 75, 47],
      [42, 54, 24, 1, 55, 25],
      [23, 45, 15, 28, 46, 16],
      // 32
      [17, 145, 115],
      [10, 74, 46, 23, 75, 47],
      [10, 54, 24, 35, 55, 25],
      [19, 45, 15, 35, 46, 16],
      // 33
      [17, 145, 115, 1, 146, 116],
      [14, 74, 46, 21, 75, 47],
      [29, 54, 24, 19, 55, 25],
      [11, 45, 15, 46, 46, 16],
      // 34
      [13, 145, 115, 6, 146, 116],
      [14, 74, 46, 23, 75, 47],
      [44, 54, 24, 7, 55, 25],
      [59, 46, 16, 1, 47, 17],
      // 35
      [12, 151, 121, 7, 152, 122],
      [12, 75, 47, 26, 76, 48],
      [39, 54, 24, 14, 55, 25],
      [22, 45, 15, 41, 46, 16],
      // 36
      [6, 151, 121, 14, 152, 122],
      [6, 75, 47, 34, 76, 48],
      [46, 54, 24, 10, 55, 25],
      [2, 45, 15, 64, 46, 16],
      // 37
      [17, 152, 122, 4, 153, 123],
      [29, 74, 46, 14, 75, 47],
      [49, 54, 24, 10, 55, 25],
      [24, 45, 15, 46, 46, 16],
      // 38
      [4, 152, 122, 18, 153, 123],
      [13, 74, 46, 32, 75, 47],
      [48, 54, 24, 14, 55, 25],
      [42, 45, 15, 32, 46, 16],
      // 39
      [20, 147, 117, 4, 148, 118],
      [40, 75, 47, 7, 76, 48],
      [43, 54, 24, 22, 55, 25],
      [10, 45, 15, 67, 46, 16],
      // 40
      [19, 148, 118, 6, 149, 119],
      [18, 75, 47, 31, 76, 48],
      [34, 54, 24, 34, 55, 25],
      [20, 45, 15, 61, 46, 16]
    ];
    const qrRSBlock = function(totalCount, dataCount) {
      const _this2 = {};
      _this2.totalCount = totalCount;
      _this2.dataCount = dataCount;
      return _this2;
    };
    const _this = {};
    const getRsBlockTable = function(typeNumber, errorCorrectionLevel) {
      switch (errorCorrectionLevel) {
        case QRErrorCorrectionLevel.L:
          return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
        case QRErrorCorrectionLevel.M:
          return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
        case QRErrorCorrectionLevel.Q:
          return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
        case QRErrorCorrectionLevel.H:
          return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
        default:
          return void 0;
      }
    };
    _this.getRSBlocks = function(typeNumber, errorCorrectionLevel) {
      const rsBlock = getRsBlockTable(typeNumber, errorCorrectionLevel);
      if (typeof rsBlock == "undefined") {
        throw "bad rs block @ typeNumber:" + typeNumber + "/errorCorrectionLevel:" + errorCorrectionLevel;
      }
      const length = rsBlock.length / 3;
      const list = [];
      for (let i = 0; i < length; i += 1) {
        const count = rsBlock[i * 3 + 0];
        const totalCount = rsBlock[i * 3 + 1];
        const dataCount = rsBlock[i * 3 + 2];
        for (let j = 0; j < count; j += 1) {
          list.push(qrRSBlock(totalCount, dataCount));
        }
      }
      return list;
    };
    return _this;
  })();
  var qrBitBuffer = function() {
    const _buffer = [];
    let _length = 0;
    const _this = {};
    _this.getBuffer = function() {
      return _buffer;
    };
    _this.getAt = function(index) {
      const bufIndex = Math.floor(index / 8);
      return (_buffer[bufIndex] >>> 7 - index % 8 & 1) == 1;
    };
    _this.put = function(num, length) {
      for (let i = 0; i < length; i += 1) {
        _this.putBit((num >>> length - i - 1 & 1) == 1);
      }
    };
    _this.getLengthInBits = function() {
      return _length;
    };
    _this.putBit = function(bit) {
      const bufIndex = Math.floor(_length / 8);
      if (_buffer.length <= bufIndex) {
        _buffer.push(0);
      }
      if (bit) {
        _buffer[bufIndex] |= 128 >>> _length % 8;
      }
      _length += 1;
    };
    return _this;
  };
  var qrNumber = function(data) {
    const _mode = QRMode.MODE_NUMBER;
    const _data = data;
    const _this = {};
    _this.getMode = function() {
      return _mode;
    };
    _this.getLength = function(buffer) {
      return _data.length;
    };
    _this.write = function(buffer) {
      const data2 = _data;
      let i = 0;
      while (i + 2 < data2.length) {
        buffer.put(strToNum(data2.substring(i, i + 3)), 10);
        i += 3;
      }
      if (i < data2.length) {
        if (data2.length - i == 1) {
          buffer.put(strToNum(data2.substring(i, i + 1)), 4);
        } else if (data2.length - i == 2) {
          buffer.put(strToNum(data2.substring(i, i + 2)), 7);
        }
      }
    };
    const strToNum = function(s) {
      let num = 0;
      for (let i = 0; i < s.length; i += 1) {
        num = num * 10 + chatToNum(s.charAt(i));
      }
      return num;
    };
    const chatToNum = function(c) {
      if ("0" <= c && c <= "9") {
        return c.charCodeAt(0) - "0".charCodeAt(0);
      }
      throw "illegal char :" + c;
    };
    return _this;
  };
  var qrAlphaNum = function(data) {
    const _mode = QRMode.MODE_ALPHA_NUM;
    const _data = data;
    const _this = {};
    _this.getMode = function() {
      return _mode;
    };
    _this.getLength = function(buffer) {
      return _data.length;
    };
    _this.write = function(buffer) {
      const s = _data;
      let i = 0;
      while (i + 1 < s.length) {
        buffer.put(
          getCode(s.charAt(i)) * 45 + getCode(s.charAt(i + 1)),
          11
        );
        i += 2;
      }
      if (i < s.length) {
        buffer.put(getCode(s.charAt(i)), 6);
      }
    };
    const getCode = function(c) {
      if ("0" <= c && c <= "9") {
        return c.charCodeAt(0) - "0".charCodeAt(0);
      } else if ("A" <= c && c <= "Z") {
        return c.charCodeAt(0) - "A".charCodeAt(0) + 10;
      } else {
        switch (c) {
          case " ":
            return 36;
          case "$":
            return 37;
          case "%":
            return 38;
          case "*":
            return 39;
          case "+":
            return 40;
          case "-":
            return 41;
          case ".":
            return 42;
          case "/":
            return 43;
          case ":":
            return 44;
          default:
            throw "illegal char :" + c;
        }
      }
    };
    return _this;
  };
  var qr8BitByte = function(data) {
    const _mode = QRMode.MODE_8BIT_BYTE;
    const _data = data;
    const _bytes = qrcode.stringToBytes(data);
    const _this = {};
    _this.getMode = function() {
      return _mode;
    };
    _this.getLength = function(buffer) {
      return _bytes.length;
    };
    _this.write = function(buffer) {
      for (let i = 0; i < _bytes.length; i += 1) {
        buffer.put(_bytes[i], 8);
      }
    };
    return _this;
  };
  var qrKanji = function(data) {
    const _mode = QRMode.MODE_KANJI;
    const _data = data;
    const stringToBytes2 = qrcode.stringToBytes;
    !(function(c, code) {
      const test = stringToBytes2(c);
      if (test.length != 2 || (test[0] << 8 | test[1]) != code) {
        throw "sjis not supported.";
      }
    })("\u53CB", 38726);
    const _bytes = stringToBytes2(data);
    const _this = {};
    _this.getMode = function() {
      return _mode;
    };
    _this.getLength = function(buffer) {
      return ~~(_bytes.length / 2);
    };
    _this.write = function(buffer) {
      const data2 = _bytes;
      let i = 0;
      while (i + 1 < data2.length) {
        let c = (255 & data2[i]) << 8 | 255 & data2[i + 1];
        if (33088 <= c && c <= 40956) {
          c -= 33088;
        } else if (57408 <= c && c <= 60351) {
          c -= 49472;
        } else {
          throw "illegal char at " + (i + 1) + "/" + c;
        }
        c = (c >>> 8 & 255) * 192 + (c & 255);
        buffer.put(c, 13);
        i += 2;
      }
      if (i < data2.length) {
        throw "illegal char at " + (i + 1);
      }
    };
    return _this;
  };
  var byteArrayOutputStream = function() {
    const _bytes = [];
    const _this = {};
    _this.writeByte = function(b) {
      _bytes.push(b & 255);
    };
    _this.writeShort = function(i) {
      _this.writeByte(i);
      _this.writeByte(i >>> 8);
    };
    _this.writeBytes = function(b, off, len) {
      off = off || 0;
      len = len || b.length;
      for (let i = 0; i < len; i += 1) {
        _this.writeByte(b[i + off]);
      }
    };
    _this.writeString = function(s) {
      for (let i = 0; i < s.length; i += 1) {
        _this.writeByte(s.charCodeAt(i));
      }
    };
    _this.toByteArray = function() {
      return _bytes;
    };
    _this.toString = function() {
      let s = "";
      s += "[";
      for (let i = 0; i < _bytes.length; i += 1) {
        if (i > 0) {
          s += ",";
        }
        s += _bytes[i];
      }
      s += "]";
      return s;
    };
    return _this;
  };
  var base64EncodeOutputStream = function() {
    let _buffer = 0;
    let _buflen = 0;
    let _length = 0;
    let _base64 = "";
    const _this = {};
    const writeEncoded = function(b) {
      _base64 += String.fromCharCode(encode(b & 63));
    };
    const encode = function(n) {
      if (n < 0) {
        throw "n:" + n;
      } else if (n < 26) {
        return 65 + n;
      } else if (n < 52) {
        return 97 + (n - 26);
      } else if (n < 62) {
        return 48 + (n - 52);
      } else if (n == 62) {
        return 43;
      } else if (n == 63) {
        return 47;
      } else {
        throw "n:" + n;
      }
    };
    _this.writeByte = function(n) {
      _buffer = _buffer << 8 | n & 255;
      _buflen += 8;
      _length += 1;
      while (_buflen >= 6) {
        writeEncoded(_buffer >>> _buflen - 6);
        _buflen -= 6;
      }
    };
    _this.flush = function() {
      if (_buflen > 0) {
        writeEncoded(_buffer << 6 - _buflen);
        _buffer = 0;
        _buflen = 0;
      }
      if (_length % 3 != 0) {
        const padlen = 3 - _length % 3;
        for (let i = 0; i < padlen; i += 1) {
          _base64 += "=";
        }
      }
    };
    _this.toString = function() {
      return _base64;
    };
    return _this;
  };
  var base64DecodeInputStream = function(str) {
    const _str = str;
    let _pos = 0;
    let _buffer = 0;
    let _buflen = 0;
    const _this = {};
    _this.read = function() {
      while (_buflen < 8) {
        if (_pos >= _str.length) {
          if (_buflen == 0) {
            return -1;
          }
          throw "unexpected end of file./" + _buflen;
        }
        const c = _str.charAt(_pos);
        _pos += 1;
        if (c == "=") {
          _buflen = 0;
          return -1;
        } else if (c.match(/^\s$/)) {
          continue;
        }
        _buffer = _buffer << 6 | decode(c.charCodeAt(0));
        _buflen += 6;
      }
      const n = _buffer >>> _buflen - 8 & 255;
      _buflen -= 8;
      return n;
    };
    const decode = function(c) {
      if (65 <= c && c <= 90) {
        return c - 65;
      } else if (97 <= c && c <= 122) {
        return c - 97 + 26;
      } else if (48 <= c && c <= 57) {
        return c - 48 + 52;
      } else if (c == 43) {
        return 62;
      } else if (c == 47) {
        return 63;
      } else {
        throw "c:" + c;
      }
    };
    return _this;
  };
  var gifImage = function(width, height) {
    const _width = width;
    const _height = height;
    const _data = new Array(width * height);
    const _this = {};
    _this.setPixel = function(x, y, pixel) {
      _data[y * _width + x] = pixel;
    };
    _this.write = function(out) {
      out.writeString("GIF87a");
      out.writeShort(_width);
      out.writeShort(_height);
      out.writeByte(128);
      out.writeByte(0);
      out.writeByte(0);
      out.writeByte(0);
      out.writeByte(0);
      out.writeByte(0);
      out.writeByte(255);
      out.writeByte(255);
      out.writeByte(255);
      out.writeString(",");
      out.writeShort(0);
      out.writeShort(0);
      out.writeShort(_width);
      out.writeShort(_height);
      out.writeByte(0);
      const lzwMinCodeSize = 2;
      const raster = getLZWRaster(lzwMinCodeSize);
      out.writeByte(lzwMinCodeSize);
      let offset = 0;
      while (raster.length - offset > 255) {
        out.writeByte(255);
        out.writeBytes(raster, offset, 255);
        offset += 255;
      }
      out.writeByte(raster.length - offset);
      out.writeBytes(raster, offset, raster.length - offset);
      out.writeByte(0);
      out.writeString(";");
    };
    const bitOutputStream = function(out) {
      const _out = out;
      let _bitLength = 0;
      let _bitBuffer = 0;
      const _this2 = {};
      _this2.write = function(data, length) {
        if (data >>> length != 0) {
          throw "length over";
        }
        while (_bitLength + length >= 8) {
          _out.writeByte(255 & (data << _bitLength | _bitBuffer));
          length -= 8 - _bitLength;
          data >>>= 8 - _bitLength;
          _bitBuffer = 0;
          _bitLength = 0;
        }
        _bitBuffer = data << _bitLength | _bitBuffer;
        _bitLength = _bitLength + length;
      };
      _this2.flush = function() {
        if (_bitLength > 0) {
          _out.writeByte(_bitBuffer);
        }
      };
      return _this2;
    };
    const getLZWRaster = function(lzwMinCodeSize) {
      const clearCode = 1 << lzwMinCodeSize;
      const endCode = (1 << lzwMinCodeSize) + 1;
      let bitLength = lzwMinCodeSize + 1;
      const table = lzwTable();
      for (let i = 0; i < clearCode; i += 1) {
        table.add(String.fromCharCode(i));
      }
      table.add(String.fromCharCode(clearCode));
      table.add(String.fromCharCode(endCode));
      const byteOut = byteArrayOutputStream();
      const bitOut = bitOutputStream(byteOut);
      bitOut.write(clearCode, bitLength);
      let dataIndex = 0;
      let s = String.fromCharCode(_data[dataIndex]);
      dataIndex += 1;
      while (dataIndex < _data.length) {
        const c = String.fromCharCode(_data[dataIndex]);
        dataIndex += 1;
        if (table.contains(s + c)) {
          s = s + c;
        } else {
          bitOut.write(table.indexOf(s), bitLength);
          if (table.size() < 4095) {
            if (table.size() == 1 << bitLength) {
              bitLength += 1;
            }
            table.add(s + c);
          }
          s = c;
        }
      }
      bitOut.write(table.indexOf(s), bitLength);
      bitOut.write(endCode, bitLength);
      bitOut.flush();
      return byteOut.toByteArray();
    };
    const lzwTable = function() {
      const _map = {};
      let _size = 0;
      const _this2 = {};
      _this2.add = function(key) {
        if (_this2.contains(key)) {
          throw "dup key:" + key;
        }
        _map[key] = _size;
        _size += 1;
      };
      _this2.size = function() {
        return _size;
      };
      _this2.indexOf = function(key) {
        return _map[key];
      };
      _this2.contains = function(key) {
        return typeof _map[key] != "undefined";
      };
      return _this2;
    };
    return _this;
  };
  var createDataURL = function(width, height, getPixel) {
    const gif = gifImage(width, height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        gif.setPixel(x, y, getPixel(x, y));
      }
    }
    const b = byteArrayOutputStream();
    gif.write(b);
    const base64 = base64EncodeOutputStream();
    const bytes = b.toByteArray();
    for (let i = 0; i < bytes.length; i += 1) {
      base64.writeByte(bytes[i]);
    }
    base64.flush();
    return "data:image/gif;base64," + base64;
  };
  var qrcode_default = qrcode;
  var stringToBytes = qrcode.stringToBytes;

  // public/log-text.json
  var log_text_default = {
    _about: "Single source of truth for every label + description rendered into the protocol log. Templates use {placeholder} for dynamic values substituted at runtime. The agent provider is spelled 'Agent Provider' (not 'AP') to avoid conflation with 'Access Server'. The person server is spelled 'Person Server' everywhere for consistency.",
    sections: {
      bootstrap: "Bootstrap",
      refresh: "Refresh",
      whoami: "Whoami",
      whoami_resumed: "Whoami (resumed)",
      notes: "Notes",
      notes_resumed: "Notes (resumed)",
      notes_api: "Notes API"
    },
    bootstrap: {
      generate_ephemeral: {
        label: "Agent: generate signing key",
        description: "The agent creates a fresh signing keypair. The private half never leaves this device, so tokens issued later are useless to anyone else."
      },
      agent_provider_request: {
        label_template: "Agent \u2192 Agent Provider: POST {path}",
        label_resolved_template: "Agent \u2192 Agent Provider: POST {path}",
        label_error_network_template: "Agent \u2192 Agent Provider: POST {path} (network error)",
        description: "The agent posts to the Agent Provider's bootstrap endpoint with a sig=hwk request \u2014 its public key is in the Signature-Key header, and the body names the Person Server the user picked. The Agent Provider records the (key thumbprint \u2192 agent name) mapping in its KV and returns an agent_token bound to the key."
      }
    },
    refresh: {
      cannot_refresh: {
        label: "Cannot refresh",
        description: "No saved key on this device, so there's nothing to refresh \u2014 a fresh bootstrap is needed."
      },
      agent_provider_request: {
        label_template: "Agent \u2192 Agent Provider: POST {path}",
        label_resolved_template: "Agent \u2192 Agent Provider: POST {path}",
        label_error_network_template: "Agent \u2192 Agent Provider: POST {path} (network error)",
        description: "The agent signs a refresh request with the same hwk key the Agent Provider already has on file. The Agent Provider looks up the agent name by thumbprint and mints a fresh agent_token bound to the same key."
      }
    },
    person_token: {
      request: {
        label_template: "Agent \u2192 Person Server: POST {path}",
        label_resolved_template: "Agent \u2192 Person Server: POST {path}",
        label_error_network_template: "Agent \u2192 Person Server: POST {path} (network error)",
        description: "Before calling a resource, the agent asks your Person Server for a person token naming that resource. The Person Server returns an aa-person+jwt whose aud is the resource, whose sub is your directed identifier there, and whose cnf holds the agent's signing key. The agent presents it in place of its agent_token \u2014 the resource learns who the agent acts for from your Person Server, not from the agent. A person token is identity, not authorization: it carries no scope. A 200 means your Person Server already knows you use this resource; a 202 means it wants to ask you first."
      },
      ps_pending_longpoll: {
        label_template: "Agent \u2192 Person Server: GET {path} (long-poll)",
        label_resolved_template: "Agent \u2192 Person Server: GET {path}",
        description: "The agent keeps one request open while you decide, instead of polling. The Person Server answers the moment you approve or deny."
      },
      ps_consent_prompt: {
        label: "User at Person Server: recognition prompt",
        description: "Your Person Server asks whether this agent may act at this resource as you. This is not a scope question \u2014 no permissions are being released yet. Because a resource may serve requests on identity alone, naming you to it is itself the decision. Approve here, or scan the QR to approve on another device."
      },
      received: {
        label: "Person Token received",
        description: "You approved this agent acting as you at this resource, and the Person Server released a person token. The agent now presents it to the resource in place of its agent_token."
      },
      authorization_granted: {
        label: "Person Token Granted",
        description: ""
      },
      authorization_denied: {
        label: "Person Token Denied",
        description: ""
      },
      authorization_timed_out: {
        label: "Person Token Request Timed Out",
        description: ""
      }
    },
    person_token_resumed: {
      ps_consent_prompt: {
        label: "User at Person Server: recognition prompt (resumed)",
        description: "You returned mid-approval. The agent picks up the same pending person token request instead of starting over, then carries on with the resource call."
      }
    },
    authorize: {
      missing_context: {
        label: "Missing agent_token or signing key",
        description: "The agent doesn't have an agent_token or key yet \u2014 bootstrap has to finish first."
      },
      agent_provider_authorize_request: {
        label_template: "Agent \u2192 Agent Provider: POST {path}",
        label_resolved_template: "Agent \u2192 Agent Provider: POST {path}",
        label_error_network_template: "Agent \u2192 Agent Provider: POST {path} (network error)",
        description: "The agent asks its Agent Provider for a resource token scoped to this Person Server and resource. The Agent Provider signs it on the agent's behalf."
      },
      ps_token_request: {
        label_template: "Agent \u2192 Person Server: POST {path}",
        label_resolved_template: "Agent \u2192 Person Server: POST {path}",
        label_error_network_template: "Agent \u2192 Person Server: POST {path} (network error)",
        description: "The agent trades that resource token at your Person Server's auth token endpoint for an auth token, signing the request with its agent_token. The Person Server resolves the person token the resource token names and confirms its ps, sub, and mission match. A 200 means you've already consented to this scope; 202 means the Person Server needs your approval for a new one."
      },
      ps_pending_longpoll: {
        label_template: "Agent \u2192 Person Server: GET {path} (long-poll)",
        label_resolved_template: "Agent \u2192 Person Server: GET {path}",
        description: "If new consent is needed, the agent keeps one request open while you decide, instead of polling. The Person Server responds the moment you approve or deny."
      },
      ps_consent_prompt: {
        label: "User at Person Server: consent prompt",
        description: "Your Person Server asks if this agent may use the requested scope. Approve here, or scan the QR to approve on another device.",
        label_resolved_success: "Interaction Completed",
        label_resolved_denied: "Interaction Denied",
        label_resolved_timed_out: "Interaction Timed Out"
      },
      authorization_granted: {
        label: "Authorization Granted",
        description: ""
      },
      authorization_denied: {
        label: "Authorization Denied",
        description: ""
      },
      authorization_timed_out: {
        label: "Authorization Timed Out",
        description: ""
      }
    },
    whoami_resumed: {
      ps_consent_prompt: {
        label: "User at Person Server: consent prompt (resumed)",
        description: "You returned mid-approval. The agent picks up the same pending request instead of starting over."
      }
    },
    notes: {
      resource_metadata_request: {
        label_template: "Agent \u2192 Notes Resource: GET {path}",
        label_resolved_template: "Agent \u2192 Notes Resource: GET {path}",
        label_error_network_template: "Agent \u2192 Notes Resource: GET {path} (network error)",
        description: "The agent fetches the resource's well-known metadata to discover the authorization endpoint plus the OpenAPI document describing the operations it can request."
      },
      openapi_request: {
        label_template: "Agent \u2192 Notes Resource: GET {path}",
        label_resolved_template: "Agent \u2192 Notes Resource: GET {path}",
        label_error_network_template: "Agent \u2192 Notes Resource: GET {path} (network error)",
        description: "The agent pulls the OpenAPI spec so it can render a checkbox per operationId \u2014 the protocol lets the agent ask for exactly the operations it needs."
      },
      authorize_request: {
        label_template: "Agent \u2192 Notes Resource: POST {path}",
        label_resolved_template: "Agent \u2192 Notes Resource: POST {path}",
        label_error_network_template: "Agent \u2192 Notes Resource: POST {path} (network error)",
        description: "The agent POSTs the operations it wants to the resource's authorize endpoint, presenting the person token it just obtained. The resource verifies that token, then responds with a resource_token carrying the person's ps and sub plus an R3 document the Person Server will fetch during token exchange."
      },
      r3_document_request: {
        label_template: "Demo: GET {path} (R3 document)",
        label_resolved_template: "Demo: GET {path} (R3 document)",
        label_error_network_template: "Demo: GET {path} (network error)",
        description: "The resource_token's r3_uri claim points at the R3 document the Person Server is about to fetch. In production this endpoint is gated on a PS HTTP signature; the notes resource leaves it publicly fetchable so the playground can preview the exact JSON the PS will receive."
      },
      ps_token_request: {
        label_template: "Agent \u2192 Person Server: POST {path}",
        label_resolved_template: "Agent \u2192 Person Server: POST {path}",
        label_error_network_template: "Agent \u2192 Person Server: POST {path} (network error)",
        description: "The agent trades the resource_token at the Person Server's auth token endpoint, signing the request with its agent_token. The Person Server matches the resource_token against the person token it names, then fetches the R3 document and emits an auth_token carrying r3_granted \u2014 the operations it's releasing. A 200 means consent was already on file; a 202 triggers a consent prompt."
      },
      ps_pending_longpoll: {
        label_template: "Agent \u2192 Person Server: GET {path} (long-poll)",
        label_resolved_template: "Agent \u2192 Person Server: GET {path}",
        description: "If new consent is needed, the agent keeps a request open while you decide. The Person Server replies the moment you approve or deny."
      },
      ps_consent_prompt: {
        label: "User at Person Server: consent prompt",
        description: "Your Person Server asks which of the requested operations to grant. Approve here, or scan the QR to approve on another device.",
        label_resolved_success: "Interaction Completed",
        label_resolved_denied: "Interaction Denied",
        label_resolved_timed_out: "Interaction Timed Out"
      },
      auth_token_received: {
        label: "Auth Token received",
        description: "The Person Server released an auth_token with r3_granted \u2014 the operations you actually approved. The agent stores this and uses it to sign every call to the Notes API."
      },
      authorization_denied: {
        label: "Authorization Denied",
        description: ""
      },
      authorization_timed_out: {
        label: "Authorization Timed Out",
        description: ""
      }
    },
    notes_resumed: {
      ps_consent_prompt: {
        label: "User at Person Server: consent prompt (resumed)",
        description: "You returned mid-approval of a Notes request. The agent picks up the same pending exchange instead of starting over."
      }
    },
    notes_app: {
      list_request: {
        label_template: "Agent \u2192 Notes API: GET {path}",
        label_resolved_template: "Agent \u2192 Notes API: GET {path}",
        label_error_network_template: "Agent \u2192 Notes API: GET {path} (network error)",
        description: "The agent lists the user's notes, signing the request with the auth_token."
      },
      create_request: {
        label_template: "Agent \u2192 Notes API: POST {path}",
        label_resolved_template: "Agent \u2192 Notes API: POST {path}",
        label_error_network_template: "Agent \u2192 Notes API: POST {path} (network error)",
        description: "The agent creates a new note."
      },
      get_request: {
        label_template: "Agent \u2192 Notes API: GET {path}",
        label_resolved_template: "Agent \u2192 Notes API: GET {path}",
        label_error_network_template: "Agent \u2192 Notes API: GET {path} (network error)",
        description: "The agent reads a single note by id."
      },
      update_request: {
        label_template: "Agent \u2192 Notes API: PUT {path}",
        label_resolved_template: "Agent \u2192 Notes API: PUT {path}",
        label_error_network_template: "Agent \u2192 Notes API: PUT {path} (network error)",
        description: "The agent updates an existing note. Saving resets the note's 24-hour expiry."
      },
      delete_request: {
        label_template: "Agent \u2192 Notes API: DELETE {path}",
        label_resolved_template: "Agent \u2192 Notes API: DELETE {path}",
        label_error_network_template: "Agent \u2192 Notes API: DELETE {path} (network error)",
        description: "The agent deletes a note."
      }
    },
    demo_api: {
      missing_key: {
        label: "Demo API Call Failed",
        description: "No signing key on this device \u2014 the demo call can't be signed, so it won't go out."
      },
      request: {
        label_template: "GET {path}",
        label_resolved_template: "GET {path}",
        label_error_network_template: "GET {path} (network error)",
        description: "The agent calls the resource's demo endpoint, signing the HTTP request with its private key and attaching the auth token. The server checks the signature matches the token, then checks the token's scope covers this endpoint."
      },
      success: {
        label: "Demo API Called",
        description: ""
      },
      failure: {
        label: "Demo API Call Failed",
        description: ""
      }
    },
    errors: {
      unhandled: {
        label: "Unhandled error",
        description: "Something went wrong that the flow wasn't expecting \u2014 check the console for details."
      }
    },
    ui: {
      another_request_button: "Another Authorization Request",
      approve_at_ps: {
        authorize_heading: "Approve this authorization request",
        continue_label: "Continue at your Person Server to approve this request",
        or_another_device: "OR scan QR code",
        copy_link_default: "Copy link",
        copy_link_copied: "Copied!"
      }
    }
  };

  // client/protocol.js
  var POLL_WAIT_SECONDS = 45;
  function copy(path) {
    return path.split(".").reduce((o, k) => o == null ? void 0 : o[k], log_text_default);
  }
  function fmt(template, vars = {}) {
    if (!template) return "";
    let out = template;
    for (const [k, v] of Object.entries(vars)) {
      out = out.split(`{${k}}`).join(String(v));
    }
    return out;
  }
  function desc(key) {
    const d = copy(`${key}.description`);
    return d ? `<p>${d}</p>` : "";
  }
  window.addEventListener("unhandledrejection", (ev) => {
    try {
      const msg = ev?.reason?.stack || ev?.reason?.message || String(ev?.reason);
      console.error("[aauth] unhandled rejection:", msg);
      showLog();
      addLogStep(
        copy("errors.unhandled.label"),
        "error",
        `<p style="color: var(--error); white-space: pre-wrap;">${escapeHtml(msg)}</p>`
      );
    } catch {
    }
  });
  async function exportSigningJwk(publicKey) {
    const jwk = await crypto.subtle.exportKey("jwk", publicKey);
    jwk.alg = "Ed25519";
    return jwk;
  }
  window.aauthSigFetch = async function aauthSigFetch(url, { method = "GET", headers = {}, body, jwt } = {}) {
    const keyPair = window.aauthEphemeral.get();
    if (!keyPair) throw new Error("no signing key available");
    if (!jwt) throw new Error("jwt required for sig=jwt scheme");
    const signingKey = await exportSigningJwk(keyPair.publicKey);
    const hasBody = body !== void 0 && body !== null;
    const components = hasBody ? ["@method", "@authority", "@path", "content-type", "signature-key"] : ["@method", "@authority", "@path", "signature-key"];
    const mergedHeaders = hasBody ? { "Content-Type": "application/json", ...headers } : { ...headers };
    return (0, import_httpsig.fetch)(url, {
      method,
      headers: mergedHeaders,
      body: hasBody ? body : void 0,
      signingKey,
      signingCryptoKey: keyPair.privateKey,
      signatureKey: { type: "jwt", jwt },
      components
    });
  };
  window.aauthSigFetchHwk = async function aauthSigFetchHwk(url, { method = "POST", headers = {}, body } = {}) {
    const keyPair = window.aauthEphemeral.get();
    if (!keyPair) throw new Error("no signing key available");
    const signingKey = await exportSigningJwk(keyPair.publicKey);
    const hasBody = body !== void 0 && body !== null;
    const components = hasBody ? ["@method", "@authority", "@path", "content-type", "signature-key"] : ["@method", "@authority", "@path", "signature-key"];
    const mergedHeaders = hasBody ? { "Content-Type": "application/json", ...headers } : { ...headers };
    return (0, import_httpsig.fetch)(url, {
      method,
      headers: mergedHeaders,
      body: hasBody ? body : void 0,
      signingKey,
      signingCryptoKey: keyPair.privateKey,
      signatureKey: { type: "hwk" },
      components
    });
  };
  var __activeLogContainer = null;
  function setActiveLog(id) {
    const el = document.getElementById(id);
    if (el) __activeLogContainer = el;
  }
  function currentLog() {
    return __activeLogContainer || document.getElementById("protocol-log");
  }
  function clearLog() {
    const log = currentLog();
    if (!log) return;
    if (log.id === "bootstrap-log") {
      const artifacts = document.getElementById("bootstrap-artifacts");
      const tokenDetails = log.querySelector("#agent-token-details");
      const decodedDetails = log.querySelector("#decoded-payload-details");
      if (artifacts && tokenDetails) artifacts.appendChild(tokenDetails);
      if (artifacts && decodedDetails) artifacts.appendChild(decodedDetails);
    }
    log.innerHTML = "";
    log.classList.add("hidden");
    if (PERSIST_LOG_IDS.includes(log.id)) clearPersistedLog(log.id);
  }
  var PERSIST_LOG_IDS = ["bootstrap-log", "whoami-log", "notes-log", "notes-api-log"];
  var persistKey = (id) => `aauth-log-${id}`;
  function persistActiveLog() {
    const log = currentLog();
    if (!log || !PERSIST_LOG_IDS.includes(log.id)) return;
    try {
      localStorage.setItem(persistKey(log.id), log.innerHTML);
    } catch {
    }
  }
  function clearPersistedLog(id) {
    try {
      localStorage.removeItem(persistKey(id));
    } catch {
    }
  }
  function clearAllPersistedLogs() {
    for (const id of PERSIST_LOG_IDS) clearPersistedLog(id);
  }
  function restorePersistedLogs() {
    for (const id of PERSIST_LOG_IDS) {
      const saved = localStorage.getItem(persistKey(id));
      if (!saved) continue;
      const log = document.getElementById(id);
      if (!log) continue;
      log.innerHTML = saved;
      log.classList.remove("hidden");
      for (const btn of log.querySelectorAll(".hello-btn-loader")) {
        btn.classList.remove("hello-btn-loader");
      }
      for (const section of log.querySelectorAll(":scope > details.log-section")) {
        section.removeAttribute("open");
      }
      if (id === "bootstrap-log") {
        document.getElementById("bootstrap-artifacts")?.classList.remove("hidden");
      }
    }
  }
  window.aauthClearPersistedLog = clearPersistedLog;
  window.aauthClearAllPersistedLogs = clearAllPersistedLogs;
  window.aauthRestorePersistedLogs = restorePersistedLogs;
  restorePersistedLogs();
  function showLog() {
    const log = currentLog();
    if (log) log.classList.remove("hidden");
  }
  function statusIndicatorHtml(status, kind) {
    if (status === "pending") {
      return '<span class="step-status step-status-pending"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>';
    }
    return "";
  }
  var CHEVRON_SVG = `<svg class="section-chevron" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>`;
  var PARTY_BADGES = [
    ["Agent Provider", "ap"],
    ["Person Server", "ps"],
    ["Notes Resource", "rs"],
    ["Notes API", "rs"],
    ["Whoami", "rs"]
  ];
  function applyPartyBadges(text) {
    return text;
  }
  function partyFromClass(el) {
    if (!el?.classList) return null;
    for (const cls of el.classList) {
      if (cls.startsWith("party-bg-")) return cls.slice("party-bg-".length);
    }
    return null;
  }
  function previousStep(section) {
    if (!section?.children) return null;
    for (let i = section.children.length - 1; i >= 0; i--) {
      const c = section.children[i];
      if (c.classList?.contains("log-step")) return c;
    }
    return null;
  }
  function previousStepBefore(step) {
    let prev = step?.previousElementSibling;
    while (prev && !prev.classList?.contains("log-step")) prev = prev.previousElementSibling;
    return prev || null;
  }
  function partyForLabel(label, section, prevStep) {
    if (label) {
      for (const [name, key] of PARTY_BADGES) {
        if (label.includes(name)) return key;
      }
    }
    const inherited = partyFromClass(prevStep);
    if (inherited) return inherited;
    return section?.dataset?.party || null;
  }
  var __copyIdCounter = 0;
  function nextCopyId() {
    return `copy-tgt-${++__copyIdCounter}`;
  }
  function isExpandable(content) {
    return !!content && !/<details[\s>]/i.test(content);
  }
  function addLogSection(title, defaultParty) {
    const log = currentLog();
    if (!log) return;
    showLog();
    const section = document.createElement("details");
    section.className = "log-section";
    section.open = true;
    if (defaultParty) section.dataset.party = defaultParty;
    const summary = document.createElement("summary");
    summary.className = "log-section-heading";
    summary.textContent = title;
    section.appendChild(summary);
    log.appendChild(section);
    persistActiveLog();
  }
  function currentSection(log) {
    const sections = log.querySelectorAll(":scope > details.log-section");
    return sections[sections.length - 1] || log;
  }
  function kindBadgeHtml(kind) {
    if (kind === "response") return '<span class="step-kind step-kind-response">Response</span>';
    return "";
  }
  function addLogStep(label, status, content, opts = {}) {
    const log = currentLog();
    if (!log) return null;
    showLog();
    const target = currentSection(log);
    const expandable = isExpandable(content);
    const step = expandable ? document.createElement("details") : document.createElement("div");
    const party = partyForLabel(label, target, previousStep(target));
    const kind = opts.kind || null;
    step.className = `log-step section-group ${status}${expandable ? "" : " log-step-static"}${party ? ` party-bg-${party}` : ""}${kind ? ` log-step-${kind}` : ""}`;
    if (expandable) step.open = true;
    const heading = document.createElement(expandable ? "summary" : "div");
    heading.className = "section-heading";
    heading.innerHTML = `<span class="step-label">${kindBadgeHtml(kind)}${statusIndicatorHtml(status, kind)}<span class="step-text">${applyPartyBadges(label)}</span></span>${expandable ? CHEVRON_SVG : ""}`;
    step.appendChild(heading);
    const body = document.createElement("div");
    body.className = "log-step-body";
    body.innerHTML = content;
    step.appendChild(body);
    target.appendChild(step);
    requestAnimationFrame(() => {
      step.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    persistActiveLog();
    return step;
  }
  function resolveStep(step, status, label) {
    if (!step) return;
    const isStatic = step.classList.contains("log-step-static");
    const kind = step.classList.contains("log-step-response") ? "response" : null;
    const section = step.closest("details.log-section");
    const party = partyForLabel(label, section, previousStepBefore(step));
    step.className = `log-step section-group ${status}${isStatic ? " log-step-static" : ""}${party ? ` party-bg-${party}` : ""}${kind ? ` log-step-${kind}` : ""}`;
    const labelEl = step.querySelector(".step-label");
    if (labelEl) {
      labelEl.innerHTML = `${kindBadgeHtml(kind)}${statusIndicatorHtml(status, kind)}<span class="step-text">${applyPartyBadges(label)}</span>`;
    }
    persistActiveLog();
  }
  function appendStepBody(step, html) {
    if (!step) return;
    const body = step.querySelector(".log-step-body");
    if (!body) return;
    body.insertAdjacentHTML("beforeend", html);
    persistActiveLog();
  }
  function anotherRequestButton() {
    queueMicrotask(() => {
      document.querySelectorAll("#resource-section .authz-actions").forEach((el) => el.classList.remove("hidden"));
    });
    return `<div class="log-actions"><button type="button" class="btn-outline js-scroll-authz">${escapeHtml(copy("ui.another_request_button"))}</button></div>`;
  }
  function tokenWrap(innerHtml, extraClass = "") {
    const id = nextCopyId();
    return `<div class="token-wrap">
    <button class="copy-btn copy-btn-float" type="button" data-copy-target="#${id}" aria-label="Copy"></button>
    <div class="token-display${extraClass ? " " + extraClass : ""}" id="${id}">${innerHtml}</div>
  </div>`;
  }
  function formatRequest(method, url, headers, body) {
    let inner = "";
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        inner += `${escapeHtml(k)}: ${escapeHtml(v)}
`;
      }
    }
    if (body) {
      if (inner) inner += "\n";
      inner += renderJSON(body);
    }
    if (!inner) inner = `${escapeHtml(method)} ${escapeHtml(url)}`;
    return `<div class="token-label token-label-request">Request</div>${tokenWrap(inner, "token-display-request")}`;
  }
  function formatResponse(status, headers, body) {
    let inner = `HTTP ${status}
`;
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        inner += `${escapeHtml(k)}: ${escapeHtml(v)}
`;
      }
    }
    if (body) {
      inner += `
${renderJSON(body)}`;
    }
    return `<div class="token-label token-label-response">Response</div>${tokenWrap(inner, "token-display-response")}`;
  }
  function formatDecoded(decoded, label = "payload") {
    return `
    <details class="section-group" open>
      <summary class="section-heading"><span>${escapeHtml(label)}</span>${CHEVRON_SVG}</summary>
      ${tokenWrap(renderJSON(decoded), "token-display-response")}
    </details>
  `;
  }
  function formatAuthToken(token) {
    return `
    ${tokenWrap(renderEncodedJWT(token), "encoded")}
    <details class="section-group" open>
      <summary class="section-heading"><span>auth_token payload</span>${CHEVRON_SVG}</summary>
      ${tokenWrap(renderJSON(decodeJWTPayloadBrowser(token)), "token-display-response")}
    </details>
  `;
  }
  function getSelectedIdentityScopes() {
    const checkboxes = document.querySelectorAll('#identity-scope-grid input[type="checkbox"]:checked');
    return Array.from(checkboxes).map((cb) => cb.value).join(" ");
  }
  function getHints() {
    return {};
  }
  async function fetchPsMetadata(bindingPs, requiredField) {
    const psMetadataUrl = `${bindingPs.replace(/\/$/, "")}/.well-known/aauth-person.json`;
    try {
      const metaRes = await fetch(psMetadataUrl);
      const psMetadata = await metaRes.json().catch(() => null);
      if (!metaRes.ok || !psMetadata?.[requiredField]) {
        addLogStep(
          "Person Server metadata fetch failed",
          "error",
          `<p>The Person Server's metadata is missing <code>${escapeHtml(requiredField)}</code>.</p>` + formatResponse(metaRes.status, null, psMetadata) + anotherRequestButton()
        );
        return null;
      }
      return psMetadata;
    } catch (err) {
      addLogStep(
        "Person Server metadata fetch failed",
        "error",
        `<p style="color: var(--error)">${escapeHtml(err.message)}</p>` + anotherRequestButton()
      );
      return null;
    }
  }
  async function fetchPersonToken({
    resource,
    bindingPs,
    keyPair,
    agentToken,
    signingJwk,
    missionS256,
    consentKey,
    pendingRecord
  }) {
    const psMetadata = await fetchPsMetadata(bindingPs, "person_token_endpoint");
    if (!psMetadata) return null;
    const endpoint = psMetadata.person_token_endpoint;
    const path = new URL(endpoint).pathname;
    const requestBody = missionS256 ? { resource, mission_s256: missionS256 } : { resource };
    const step = addLogStep(
      fmt(copy("person_token.request.label_template"), { path }),
      "pending",
      desc("person_token.request") + formatRequest("POST", endpoint, {
        "Content-Type": "application/json",
        "Content-Digest": "sha-256=:...:",
        "Signature-Input": 'sig=("@method" "@authority" "@path" "content-type" "content-digest" "signature-key");created=...',
        "Signature": "sig=:...:",
        "Signature-Key": `sig=jwt;jwt="${agentToken?.substring(0, 20)}..."`
      }, requestBody)
    );
    try {
      const res = await (0, import_httpsig.fetch)(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signingKey: signingJwk,
        signingCryptoKey: keyPair.privateKey,
        // The agent is still only an agent here — the person token is what
        // it is asking for, so it presents its agent_token to get one.
        signatureKey: { type: "jwt", jwt: agentToken },
        // A request with a body to a PS endpoint signs content-digest and
        // content-type as well, so the body is covered by the signature.
        components: ["@method", "@authority", "@path", "content-type", "content-digest", "signature-key"]
      });
      const body = await res.json().catch(() => null);
      const respHeaders = {};
      for (const key of ["location", "retry-after", "aauth-requirement"]) {
        const v = res.headers.get(key);
        if (v) respHeaders[key] = v;
      }
      resolveStep(
        step,
        res.status === 200 || res.status === 202 ? "success" : "error",
        fmt(copy("person_token.request.label_resolved_template"), { path, status: res.status })
      );
      appendStepBody(step, formatResponse(res.status, respHeaders, body));
      if (res.status === 200 && body?.person_token) {
        appendStepBody(step, formatDecoded(decodeJWTPayloadBrowser(body.person_token), "person_token payload"));
        return { personToken: body.person_token, psMetadata };
      }
      if (res.status === 202) {
        const personToken = await runDeferredResponse({
          res,
          body,
          endpoint,
          psMetadata,
          consentKey: `${consentKey}-person`,
          copyPrefix: "person_token",
          tokenField: "person_token",
          consentLabel: copy("person_token.ps_consent_prompt.label"),
          consentDescription: desc("person_token.ps_consent_prompt"),
          pendingRecord: { ...pendingRecord, stage: "person-token", psUrl: bindingPs }
        });
        if (!personToken) return null;
        showPersonTokenReceived(personToken);
        return { personToken, psMetadata };
      }
      appendStepBody(step, anotherRequestButton());
      return null;
    } catch (err) {
      resolveStep(step, "error", fmt(copy("person_token.request.label_error_network_template"), { path }));
      appendStepBody(step, `<p style="color: var(--error)">${escapeHtml(err.message)}</p>` + anotherRequestButton());
      return null;
    }
  }
  function showPersonTokenReceived(personToken) {
    addLogStep(
      copy("person_token.received.label"),
      "success",
      desc("person_token.received") + formatDecoded(decodeJWTPayloadBrowser(personToken), "person_token payload"),
      { kind: "response" }
    );
  }
  function currentMissionS256() {
    return window.AAUTH_MISSION_S256 || null;
  }
  async function runBootstrap(psUrl) {
    addLogSection(copy("sections.bootstrap"));
    const { keyPair, publicJwk } = await window.aauthEphemeral.rotate();
    addLogStep(
      copy("bootstrap.generate_ephemeral.label"),
      "success",
      desc("bootstrap.generate_ephemeral") + tokenWrap(renderJSON({ kty: publicJwk.kty, crv: publicJwk.crv, x: publicJwk.x }))
    );
    const endpoint = `${window.location.origin}/bootstrap`;
    const body = { ps: psUrl };
    const reqStep = addLogStep(
      fmt(copy("bootstrap.agent_provider_request.label_template"), { path: "/bootstrap" }),
      "pending",
      desc("bootstrap.agent_provider_request") + formatRequest("POST", endpoint, {
        "Content-Type": "application/json",
        "Signature-Input": 'sig=("@method" "@authority" "@path" "content-type" "signature-key");created=...',
        "Signature": "sig=:...:",
        "Signature-Key": `sig=hwk;alg="${publicJwk.alg}";kty="${publicJwk.kty}";crv="${publicJwk.crv}";x="${publicJwk.x}"`
      }, body)
    );
    let result;
    try {
      const res = await (0, import_httpsig.fetch)(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signingKey: publicJwk,
        signingCryptoKey: keyPair.privateKey,
        signatureKey: { type: "hwk" },
        components: ["@method", "@authority", "@path", "content-type", "signature-key"]
      });
      result = await res.json().catch(() => null);
      if (!res.ok || !result?.agent_token) {
        resolveStep(reqStep, "error", fmt(copy("bootstrap.agent_provider_request.label_resolved_template"), { path: "/bootstrap" }) + ` \u2192 ${res.status}`);
        appendStepBody(reqStep, formatResponse(res.status, null, result));
        return false;
      }
      resolveStep(reqStep, "success", fmt(copy("bootstrap.agent_provider_request.label_resolved_template"), { path: "/bootstrap" }) + ` \u2192 ${res.status}`);
      appendStepBody(reqStep, formatResponse(res.status, null, result));
      appendStepBody(reqStep, formatDecoded(decodeJWTPayloadBrowser(result.agent_token), "agent_token payload"));
    } catch (err) {
      resolveStep(reqStep, "error", fmt(copy("bootstrap.agent_provider_request.label_error_network_template"), { path: "/bootstrap" }));
      appendStepBody(reqStep, `<p style="color: var(--error)">${escapeHtml(err.message)}</p>`);
      return false;
    }
    window.aauthApplyBootstrapResult(result);
    return { result };
  }
  async function runRefresh() {
    const keyPair = window.aauthEphemeral.get();
    if (!keyPair) {
      addLogStep(
        copy("refresh.cannot_refresh.label"),
        "error",
        desc("refresh.cannot_refresh")
      );
      return null;
    }
    addLogSection(copy("sections.refresh"));
    const publicJwk = await exportSigningJwk(keyPair.publicKey);
    let psUrl;
    const savedToken = localStorage.getItem("aauth-agent-token");
    if (savedToken) {
      try {
        psUrl = decodeJWTPayloadBrowser(savedToken)?.ps;
      } catch {
      }
    }
    if (!psUrl) psUrl = window.getCurrentPS?.() || void 0;
    const body = psUrl ? { ps: psUrl } : {};
    const endpoint = `${window.location.origin}/refresh`;
    const reqStep = addLogStep(
      fmt(copy("refresh.agent_provider_request.label_template"), { path: "/refresh" }),
      "pending",
      desc("refresh.agent_provider_request") + formatRequest("POST", endpoint, {
        "Content-Type": "application/json",
        "Signature-Input": 'sig=("@method" "@authority" "@path" "content-type" "signature-key");created=...',
        "Signature": "sig=:...:",
        "Signature-Key": `sig=hwk;alg="${publicJwk.alg}";kty="${publicJwk.kty}";crv="${publicJwk.crv}";x="${publicJwk.x}"`
      }, body)
    );
    let result;
    try {
      const res = await (0, import_httpsig.fetch)(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signingKey: publicJwk,
        signingCryptoKey: keyPair.privateKey,
        signatureKey: { type: "hwk" },
        components: ["@method", "@authority", "@path", "content-type", "signature-key"]
      });
      result = await res.json().catch(() => null);
      if (!res.ok || !result?.agent_token) {
        resolveStep(reqStep, "error", fmt(copy("refresh.agent_provider_request.label_resolved_template"), { path: "/refresh" }) + ` \u2192 ${res.status}`);
        appendStepBody(reqStep, formatResponse(res.status, null, result));
        return null;
      }
      resolveStep(reqStep, "success", fmt(copy("refresh.agent_provider_request.label_resolved_template"), { path: "/refresh" }) + ` \u2192 ${res.status}`);
      appendStepBody(reqStep, formatResponse(res.status, null, result));
      appendStepBody(reqStep, formatDecoded(decodeJWTPayloadBrowser(result.agent_token), "agent_token payload"));
    } catch (err) {
      resolveStep(reqStep, "error", fmt(copy("refresh.agent_provider_request.label_error_network_template"), { path: "/refresh" }));
      appendStepBody(reqStep, `<p style="color: var(--error)">${escapeHtml(err.message)}</p>`);
      return null;
    }
    window.aauthApplyBootstrapResult(result);
    return result;
  }
  async function startBootstrap() {
    const psUrl = (window.getCurrentPS?.() || "").trim();
    if (!psUrl) {
      alert("Please choose or enter a Person Server URL");
      return;
    }
    const controls = document.getElementById("bootstrap-controls");
    controls?.classList.add("hidden");
    localStorage.removeItem("aauth-agent-token");
    window.aauthUI?.setUnauthenticated?.();
    document.getElementById("bootstrap-artifacts")?.classList.remove("hidden");
    setActiveLog("bootstrap-log");
    clearLog();
    showLog();
    const result = await runBootstrap(psUrl);
    if (!result) {
      controls?.classList.remove("hidden");
    }
  }
  function getBoundPs() {
    const token = localStorage.getItem("aauth-agent-token");
    if (!token) return null;
    try {
      return decodeJWTPayloadBrowser(token)?.ps || null;
    } catch {
      return null;
    }
  }
  async function startWhoami() {
    const bindingPs = getBoundPs() || window.getCurrentPS?.();
    if (!bindingPs) {
      alert("No agent token found. Bootstrap first.");
      return;
    }
    setActiveLog("whoami-log");
    clearLog();
    showLog();
    document.querySelector("#resource-section .authz-actions")?.classList.add("hidden");
    let agentTokenValid = false;
    const savedAgentToken = localStorage.getItem("aauth-agent-token");
    if (savedAgentToken) {
      try {
        const p = decodeJWTPayloadBrowser(savedAgentToken);
        agentTokenValid = p && p.exp > Math.floor(Date.now() / 1e3);
      } catch {
      }
    }
    if (!agentTokenValid) {
      const refreshed = await runRefresh();
      if (!refreshed) return;
    }
    const hints = getHints();
    const identityScopes = getSelectedIdentityScopes();
    const whoamiOrigin = window.WHOAMI_ORIGIN || "https://whoami.aauth.dev";
    const whoamiUrl = identityScopes ? `${whoamiOrigin}/?scope=${encodeURIComponent(identityScopes)}` : `${whoamiOrigin}/`;
    await runWhoamiCall(whoamiUrl, bindingPs, hints);
  }
  async function runWhoamiCall(whoamiUrl, bindingPs, hints) {
    const keyPair = window.aauthEphemeral.get();
    const agentToken = localStorage.getItem("aauth-agent-token");
    if (!keyPair || !agentToken) {
      addLogStep(
        "Missing agent_token or ephemeral key",
        "error",
        "<p>The agent doesn't have an agent token or key yet \u2014 bootstrap has to finish first.</p>"
      );
      return;
    }
    const signingJwk = await exportSigningJwk(keyPair.publicKey);
    addLogSection(copy("sections.whoami"));
    const personResult = await fetchPersonToken({
      resource: new URL(whoamiUrl).origin,
      bindingPs,
      keyPair,
      agentToken,
      signingJwk,
      missionS256: currentMissionS256(),
      consentKey: "whoami",
      pendingRecord: { whoamiUrl }
    });
    if (!personResult) return;
    await continueWhoami({
      whoamiUrl,
      bindingPs,
      hints,
      keyPair,
      agentToken,
      signingJwk,
      personToken: personResult.personToken,
      psMetadata: personResult.psMetadata
    });
  }
  async function continueWhoami({ whoamiUrl, bindingPs, hints, keyPair, agentToken, signingJwk, personToken, psMetadata }) {
    const urlObj = new URL(whoamiUrl);
    const whoamiPathDisplay = urlObj.pathname + urlObj.search;
    const step1 = addLogStep(
      `Agent \u2192 Whoami: GET ${whoamiPathDisplay}`,
      "pending",
      `<p>Agent calls whoami with the person_token it just obtained. The resource knows which person the agent acts for, but a person token carries no authorization, so it returns 401 with a resource_token the agent can exchange at the Person Server.</p>` + formatRequest("GET", whoamiUrl, {
        "Signature-Input": 'sig=("@method" "@authority" "@path" "signature-key");created=...',
        "Signature": "sig=:...:",
        "Signature-Key": `sig=jwt;jwt="${personToken?.substring(0, 20)}..."`
      }, null)
    );
    let resourceToken;
    try {
      const res = await (0, import_httpsig.fetch)(whoamiUrl, {
        method: "GET",
        signingKey: signingJwk,
        signingCryptoKey: keyPair.privateKey,
        signatureKey: { type: "jwt", jwt: personToken },
        components: ["@method", "@authority", "@path", "signature-key"]
      });
      const body = await res.json().catch(() => null);
      const requirement = res.headers.get("aauth-requirement") || "";
      const respHeaders = {};
      if (requirement) respHeaders["aauth-requirement"] = requirement;
      if (res.status === 401) {
        resourceToken = parseInteractionHeader(requirement)["resource-token"];
      }
      if (res.status === 200) {
        resolveStep(step1, "success", `Agent \u2192 Whoami: GET ${whoamiPathDisplay}`);
        appendStepBody(step1, formatResponse(200, respHeaders, body));
        addLogStep(
          "Person identity received",
          "success",
          `<p>No scopes were requested, so whoami answered on identity alone \u2014 straight from the person_token, with no auth token and no Person Server exchange. A resource that serves requests this way treats holding a person token as access.</p>` + tokenWrap(renderJSON(body)) + anotherRequestButton(),
          { kind: "response" }
        );
        return;
      }
      if (res.status === 401 && resourceToken) {
        resolveStep(step1, "error", `Agent \u2192 Whoami: GET ${whoamiPathDisplay}`);
        appendStepBody(step1, formatResponse(401, respHeaders, body));
        appendStepBody(step1, formatDecoded(decodeJWTPayloadBrowser(resourceToken), "resource_token payload"));
      } else {
        resolveStep(step1, "error", `Agent \u2192 Whoami: GET ${whoamiPathDisplay}`);
        appendStepBody(step1, formatResponse(res.status, respHeaders, body) + anotherRequestButton());
        return;
      }
    } catch (err) {
      resolveStep(step1, "error", `Agent \u2192 Whoami: GET ${whoamiPathDisplay} (network error)`);
      appendStepBody(step1, `<p style="color: var(--error)">${escapeHtml(err.message)}</p>` + anotherRequestButton());
      return;
    }
    await runPSTokenExchange({
      resourceToken,
      bindingPs,
      hints,
      keyPair,
      agentToken,
      signingJwk,
      psMetadata,
      labels: {
        postLabel: (path) => `Agent \u2192 Person Server: POST ${path}`,
        postLabelResolved: (path, status) => status === 200 || status === 202 ? `Agent \u2192 Person Server: POST ${path}` : `Agent \u2192 Person Server: POST ${path} \u2192 ${status}`,
        postLabelNetworkError: (path) => `Agent \u2192 Person Server: POST ${path} (network error)`,
        postDescription: `<p>Agent presents the resource_token and its agent_token to the Person Server's auth token endpoint. The PS looks up the person token named by <code>person_token_jti</code>, checks the resource_token's <code>ps</code> and <code>sub</code> against it, then either releases an auth_token immediately (cached consent) or returns a 202 with a consent prompt.</p>`,
        consentLabel: copy("authorize.ps_consent_prompt.label"),
        consentDescription: desc("authorize.ps_consent_prompt")
      },
      copyPrefix: "authorize",
      consentKey: "whoami",
      pendingExtra: { whoamiUrl },
      onAuthToken: async (token, { viaPolling }) => {
        if (viaPolling) showWhoamiAuthTokenReceived(token);
        await retryWhoami(whoamiUrl, whoamiPathDisplay, token, keyPair, signingJwk);
      }
    });
  }
  function showWhoamiAuthTokenReceived(authToken) {
    addLogStep(
      "Auth Token received",
      "success",
      `<p>The Person Server released an auth_token for the requested whoami scopes. The agent will use this to sign the next call to Whoami.</p>` + formatDecoded(decodeJWTPayloadBrowser(authToken), "auth_token payload"),
      { kind: "response" }
    );
  }
  async function retryWhoami(whoamiUrl, whoamiPathDisplay, authToken, keyPair, signingJwk) {
    const step = addLogStep(
      `Agent \u2192 Whoami: GET ${whoamiPathDisplay}`,
      "pending",
      `<p>Same GET as before, now signed with the auth_token. Whoami verifies the token against the Person Server's JWKS, checks that 'whoami' is in scope, and returns the identity claims carried in the payload.</p>` + formatRequest("GET", whoamiUrl, {
        "Signature-Input": 'sig=("@method" "@authority" "@path" "signature-key");created=...',
        "Signature": "sig=:...:",
        "Signature-Key": `sig=jwt;jwt="${authToken?.substring(0, 20)}..."`
      }, null)
    );
    try {
      const res = await (0, import_httpsig.fetch)(whoamiUrl, {
        method: "GET",
        signingKey: signingJwk,
        signingCryptoKey: keyPair.privateKey,
        signatureKey: { type: "jwt", jwt: authToken },
        components: ["@method", "@authority", "@path", "signature-key"]
      });
      const body = await res.json().catch(() => null);
      resolveStep(step, res.ok ? "success" : "error", `Agent \u2192 Whoami: GET ${whoamiPathDisplay}`);
      if (res.ok) {
        addLogStep(
          "Identity claims received",
          "success",
          `<p>These are the claims the Person Server released for the scopes you granted. Compare them against the decoded auth_token payload above \u2014 whoami returns them verbatim from the token.</p>` + tokenWrap(renderJSON(body)) + anotherRequestButton(),
          { kind: "response" }
        );
      } else {
        appendStepBody(step, formatResponse(res.status, null, body));
        appendStepBody(step, anotherRequestButton());
      }
    } catch (err) {
      resolveStep(step, "error", `Agent \u2192 Whoami: GET ${whoamiPathDisplay} (network error)`);
      appendStepBody(step, `<p style="color: var(--error)">${escapeHtml(err.message)}</p>` + anotherRequestButton());
    }
  }
  function parseInteractionHeader(header) {
    const result = {};
    const parts = header.split(";").map((s) => s.trim());
    for (const part of parts) {
      const eq = part.indexOf("=");
      if (eq === -1) continue;
      const key = part.substring(0, eq).trim();
      let val = part.substring(eq + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      result[key] = val;
    }
    return result;
  }
  function renderInteraction(interaction, pollUrl, kind = "bootstrap") {
    if (!interaction.url || !interaction.code) {
      const missing = [];
      if (!interaction.url) missing.push("interaction_endpoint (PS metadata) or url (header)");
      if (!interaction.code) missing.push("code");
      return `<p style="color: var(--muted);">Interaction required but missing: ${escapeHtml(missing.join(", "))}.</p>`;
    }
    const heading = kind === "authorize" ? copy("ui.approve_at_ps.authorize_heading") : copy("ui.approve_at_ps.bootstrap_heading");
    const callbackUrl = `${window.location.origin}/popup-callback`;
    const sameDeviceUrl = `${interaction.url}?code=${encodeURIComponent(interaction.code)}&callback=${encodeURIComponent(callbackUrl)}`;
    const qrUrl = `${interaction.url}?code=${encodeURIComponent(interaction.code)}`;
    const qrId = `qr-${Math.random().toString(36).slice(2, 9)}`;
    const showQr = kind !== "bootstrap";
    const html = `
    <div class="interaction-box">
      <p class="interaction-heading">${escapeHtml(heading)}</p>
      <div class="interaction-actions">
        <a class="hello-btn hello-btn-black-on-dark" href="${escapeHtml(sameDeviceUrl)}">\u014D&nbsp;&nbsp;&nbsp;Continue with Hell\u014D</a>
      </div>
      ${showQr ? `
        <div class="interaction-or"><span>${escapeHtml(copy("ui.approve_at_ps.or_another_device"))}</span></div>
        <div class="qr-code" id="${qrId}"></div>
        <div class="interaction-url-row">
          <button class="copy-btn copy-link-text" type="button" data-copy="${escapeHtml(qrUrl)}">
            <span class="copy-link-text__default">Copy link</span>
            <span class="copy-link-text__copied">Copied!</span>
          </button>
        </div>
      ` : ""}
    </div>
  `;
    if (showQr) {
      setTimeout(() => {
        const qrContainer = document.getElementById(qrId);
        if (!qrContainer) return;
        try {
          const qr = qrcode_default(0, "M");
          qr.addData(qrUrl);
          qr.make();
          qrContainer.innerHTML = qr.createSvgTag({ scalable: true, margin: 0 });
        } catch (err) {
          qrContainer.textContent = `(QR generation failed: ${err.message})`;
        }
      }, 0);
    }
    return html;
  }
  var PENDING_AUTHZ_KEY = "aauth-pending-authorize";
  function savePendingAuthorize(state) {
    try {
      localStorage.setItem(PENDING_AUTHZ_KEY, JSON.stringify({ ...state, startedAt: Date.now() }));
    } catch {
    }
  }
  function clearPendingAuthorize() {
    try {
      localStorage.removeItem(PENDING_AUTHZ_KEY);
    } catch {
    }
  }
  var _resumeAuthorizePolling = false;
  async function resumePendingAuthorize() {
    let saved;
    try {
      saved = JSON.parse(localStorage.getItem(PENDING_AUTHZ_KEY) || "null");
    } catch {
      saved = null;
    }
    if (!saved?.pollUrl) return false;
    if (Date.now() - (saved.startedAt || 0) > 10 * 60 * 1e3) {
      clearPendingAuthorize();
      return false;
    }
    const keyPair = window.aauthEphemeral.get();
    const agentToken = localStorage.getItem("aauth-agent-token");
    if (!keyPair || !agentToken) {
      clearPendingAuthorize();
      return false;
    }
    if (_resumeAuthorizePolling) return false;
    _resumeAuthorizePolling = true;
    document.querySelectorAll("#resource-section .authz-actions").forEach((el) => el.classList.add("hidden"));
    setActiveLog(saved.notesAuthorize ? "notes-log" : "whoami-log");
    window.aauthActivateTab?.(saved.notesAuthorize ? "notes" : "whoami");
    showLog();
    currentLog()?.querySelectorAll(":scope > details.log-section").forEach((s) => s.setAttribute("open", ""));
    const isNotes = !!saved.notesAuthorize;
    const isPersonStage = saved.stage === "person-token";
    const promptKey = isPersonStage ? "person_token_resumed.ps_consent_prompt" : isNotes ? "notes_resumed.ps_consent_prompt" : "whoami_resumed.ps_consent_prompt";
    const log = currentLog();
    if (!log.querySelector(":scope > details.log-section")) {
      addLogSection(copy(isNotes ? "sections.notes" : "sections.whoami"));
    }
    const consentKey = `${isNotes ? "notes" : "whoami"}${isPersonStage ? "-person" : ""}`;
    let interactionStep = log.querySelector(`[data-consent-key="${consentKey}"]`);
    if (!interactionStep) {
      interactionStep = addLogStep(copy(`${promptKey}.label`), "pending", desc(promptKey));
    }
    const existingPollStep = log.querySelector(`[data-poll-key="${consentKey}"]`);
    const signingJwk = await exportSigningJwk(keyPair.publicKey);
    const token = await startDeferredPolling(
      saved.pollUrl,
      saved.tokenEndpoint,
      interactionStep,
      existingPollStep || null,
      {
        tokenField: isPersonStage ? "person_token" : "auth_token",
        copyPrefix: isPersonStage ? "person_token" : isNotes ? "notes" : "authorize",
        // No continuation below for a record with neither marker — fall
        // back to the generic "Authorization Granted" step.
        renderGranted: !isPersonStage && !isNotes && !saved.whoamiUrl
      }
    );
    if (!token) return true;
    if (isPersonStage) {
      showPersonTokenReceived(token);
      if (isNotes) {
        await continueNotesAuthorize({
          authzEndpoint: saved.authzEndpoint || `${window.NOTES_ORIGIN}/authorize`,
          operations: saved.operations || [],
          bindingPs: saved.psUrl,
          hints: getHints(),
          keyPair,
          agentToken,
          signingJwk,
          personToken: token,
          psMetadata: null
        });
      } else if (saved.whoamiUrl) {
        await continueWhoami({
          whoamiUrl: saved.whoamiUrl,
          bindingPs: saved.psUrl,
          hints: getHints(),
          keyPair,
          agentToken,
          signingJwk,
          personToken: token,
          psMetadata: null
        });
      }
      return true;
    }
    if (isNotes) {
      await finalizeNotesAuthToken(token);
    } else if (saved.whoamiUrl) {
      const urlObj = new URL(saved.whoamiUrl);
      showWhoamiAuthTokenReceived(token);
      await retryWhoami(saved.whoamiUrl, urlObj.pathname + urlObj.search, token, keyPair, signingJwk);
    }
    return true;
  }
  window.resumePendingAuthorize = resumePendingAuthorize;
  function fireFallbackResume() {
    setTimeout(() => {
      try {
        window.resumePendingAuthorize?.();
      } catch (err) {
        console.error("[aauth] fallback resumePendingAuthorize threw:", err);
      }
    }, 200);
  }
  if (document.readyState === "complete") {
    fireFallbackResume();
  } else {
    window.addEventListener("load", fireFallbackResume, { once: true });
  }
  async function runPSTokenExchange({
    resourceToken,
    bindingPs,
    hints,
    keyPair,
    agentToken,
    signingJwk,
    // Per-flow labels/descriptions. Functions where the value depends
    // on runtime state (path, status); plain strings/HTML otherwise.
    labels,
    // 'whoami' | 'notes' — written to data-poll-key / data-consent-key
    // so resumePendingAuthorize can re-locate the steps after a same-tab
    // PS redirect.
    consentKey,
    // Merged into the savePendingAuthorize record so the resumed flow
    // can dispatch the correct post-token handler ({whoamiUrl} for
    // whoami, {notesAuthorize: true} for notes, etc.).
    pendingExtra,
    // Called once auth_token is in hand. `viaPolling` is true if the
    // token came from the consent long-poll, false if from the cached
    // 200 path. Whoami uses this to gate showWhoamiAuthTokenReceived
    // (the 200 path already renders decoded inline on the POST step, so
    // a separate "Auth Token received" step would just duplicate). Notes
    // ignores it — its finalizeNotesAuthToken always emits its own step.
    onAuthToken,
    // PS metadata already fetched for the person-token hop. Both flows pass
    // it through rather than re-fetching the same document.
    psMetadata: knownPsMetadata,
    // Narration block in log-text.json the deferred (202) leg reads its
    // long-poll and terminal labels from.
    copyPrefix
  }) {
    const psMetadata = knownPsMetadata || await fetchPsMetadata(bindingPs, "auth_token_endpoint");
    if (!psMetadata) return;
    if (!psMetadata.auth_token_endpoint) {
      addLogStep(
        "Person Server metadata fetch failed",
        "error",
        `<p>The Person Server's metadata is missing <code>auth_token_endpoint</code>.</p>` + tokenWrap(renderJSON(psMetadata)) + anotherRequestButton()
      );
      return;
    }
    const tokenEndpoint = psMetadata.auth_token_endpoint;
    const psPath = new URL(tokenEndpoint).pathname;
    const psBody = {
      resource_token: resourceToken,
      capabilities: ["interaction"],
      // Force the consent screen every time so the demo always shows the
      // full UX — matches the bootstrap + old authorize flows.
      prompt: "consent",
      ...hints,
      provider_hint: "email--"
    };
    const step2 = addLogStep(
      labels.postLabel(psPath),
      "pending",
      labels.postDescription + formatRequest("POST", tokenEndpoint, {
        "Content-Type": "application/json",
        "Content-Digest": "sha-256=:...:",
        "Signature-Input": 'sig=("@method" "@authority" "@path" "content-type" "content-digest" "signature-key");created=...',
        "Signature": "sig=:...:",
        "Signature-Key": `sig=jwt;jwt="${agentToken?.substring(0, 20)}..."`
      }, psBody)
    );
    let authToken;
    try {
      const psRes = await (0, import_httpsig.fetch)(tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(psBody),
        signingKey: signingJwk,
        signingCryptoKey: keyPair.privateKey,
        signatureKey: { type: "jwt", jwt: agentToken },
        // -11: a request carrying a body to a PS or AS endpoint MUST
        // additionally sign content-digest and content-type.
        components: ["@method", "@authority", "@path", "content-type", "content-digest", "signature-key"]
      });
      const psResBody = await psRes.json().catch(() => null);
      const respHeaders = {};
      for (const key of ["location", "retry-after", "aauth-requirement"]) {
        const v = psRes.headers.get(key);
        if (v) respHeaders[key] = v;
      }
      if (psRes.status === 200 && psResBody?.auth_token) {
        authToken = psResBody.auth_token;
        resolveStep(step2, "success", labels.postLabelResolved(psPath, 200));
        appendStepBody(step2, formatResponse(200, respHeaders, psResBody));
        appendStepBody(step2, formatDecoded(decodeJWTPayloadBrowser(authToken), "auth_token payload"));
      } else if (psRes.status === 202) {
        resolveStep(step2, "success", labels.postLabelResolved(psPath, 202));
        appendStepBody(step2, formatResponse(202, respHeaders, psResBody));
        const tokenFromPoll = await runDeferredResponse({
          res: psRes,
          body: psResBody,
          endpoint: tokenEndpoint,
          psMetadata,
          consentKey,
          copyPrefix,
          tokenField: "auth_token",
          consentLabel: labels.consentLabel,
          consentDescription: labels.consentDescription,
          pendingRecord: { ...pendingExtra, stage: "auth-token", psUrl: bindingPs }
        });
        if (tokenFromPoll) await onAuthToken(tokenFromPoll, { viaPolling: true });
        return;
      } else {
        resolveStep(step2, "error", labels.postLabelResolved(psPath, psRes.status));
        appendStepBody(step2, formatResponse(psRes.status, respHeaders, psResBody) + anotherRequestButton());
        return;
      }
    } catch (err) {
      resolveStep(step2, "error", labels.postLabelNetworkError(psPath));
      appendStepBody(step2, `<p style="color: var(--error)">${escapeHtml(err.message)}</p>` + anotherRequestButton());
      return;
    }
    await onAuthToken(authToken, { viaPolling: false });
  }
  var _deferredPollRunning = false;
  async function startDeferredPolling(pollUrl, baseUrl, interactionStep, pollStep, options = {}) {
    if (_deferredPollRunning) return null;
    _deferredPollRunning = true;
    try {
      return await _deferredPollingImpl(pollUrl, baseUrl, interactionStep, pollStep, options);
    } finally {
      _deferredPollRunning = false;
    }
  }
  async function runDeferredResponse({
    res,
    body,
    endpoint,
    psMetadata,
    // 'whoami' | 'notes', suffixed per leg — written to data-poll-key /
    // data-consent-key so resumePendingAuthorize can re-locate both steps
    // after the redirect instead of orphaning them as stale pending rows.
    consentKey,
    copyPrefix,
    tokenField,
    consentLabel,
    consentDescription,
    // Merged into the persisted record; carries `stage` plus whatever the
    // resumed flow needs to pick up where it left off.
    pendingRecord
  }) {
    const fromHeader = parseInteractionHeader(res.headers.get("aauth-requirement") || "");
    const interaction = {
      requirement: fromHeader.requirement || body?.requirement,
      code: fromHeader.code || body?.code,
      url: fromHeader.url || psMetadata?.interaction_endpoint
    };
    const pollUrl = res.headers.get("location") || body?.location;
    if (!pollUrl) {
      addLogStep(
        "Deferred response missing Location",
        "error",
        `<p>The Person Server answered 202 without a <code>Location</code> to poll, so the agent has nowhere to wait.</p>` + anotherRequestButton()
      );
      return null;
    }
    const absolutePollUrl = new URL(pollUrl, endpoint).href;
    const agentToken = localStorage.getItem("aauth-agent-token");
    const pollStep = addLogStep(
      fmt(copy(`${copyPrefix}.ps_pending_longpoll.label_template`), { path: new URL(absolutePollUrl).pathname }),
      "pending",
      desc(`${copyPrefix}.ps_pending_longpoll`) + formatRequest("GET", absolutePollUrl, {
        "Prefer": `wait=${POLL_WAIT_SECONDS}`,
        "Signature-Input": 'sig=("@method" "@authority" "@path" "signature-key");created=...',
        "Signature": "sig=:...:",
        "Signature-Key": `sig=jwt;jwt="${agentToken?.substring(0, 20)}..."`
      }, null)
    );
    if (pollStep) {
      pollStep.dataset.pollKey = consentKey;
      persistActiveLog();
    }
    const interactionStep = addLogStep(
      consentLabel,
      "pending",
      consentDescription + renderInteraction(interaction, pollUrl, "authorize")
    );
    if (interactionStep) {
      interactionStep.dataset.consentKey = consentKey;
      persistActiveLog();
    }
    savePendingAuthorize({ ...pendingRecord, pollUrl: absolutePollUrl, tokenEndpoint: endpoint });
    return startDeferredPolling(absolutePollUrl, endpoint, interactionStep, pollStep, {
      tokenField,
      copyPrefix
    });
  }
  async function _deferredPollingImpl(pollUrl, baseUrl, interactionStep, pollStep, options = {}) {
    const tokenField = options.tokenField || "auth_token";
    const copyPrefix = options.copyPrefix || "authorize";
    const targetLog = currentLog();
    const pinLog = () => {
      if (targetLog) __activeLogContainer = targetLog;
    };
    const absolutePollUrl = new URL(pollUrl, baseUrl).href;
    const keyPair = window.aauthEphemeral.get();
    const agentToken = localStorage.getItem("aauth-agent-token");
    if (!keyPair || !agentToken) return null;
    const signingJwk = await exportSigningJwk(keyPair.publicKey);
    const pollPath = new URL(absolutePollUrl).pathname;
    if (!pollStep) {
      pollStep = addLogStep(
        fmt(copy(`${copyPrefix}.ps_pending_longpoll.label_template`), { path: pollPath }),
        "pending",
        desc(`${copyPrefix}.ps_pending_longpoll`) + formatRequest("GET", absolutePollUrl, {
          "Prefer": `wait=${POLL_WAIT_SECONDS}`,
          "Signature-Input": 'sig=("@method" "@authority" "@path" "signature-key");created=...',
          "Signature": "sig=:...:",
          "Signature-Key": `sig=jwt;jwt="${agentToken?.substring(0, 20)}..."`
        }, null)
      );
    }
    let cycle = 0;
    while (true) {
      cycle++;
      try {
        const res = await (0, import_httpsig.fetch)(absolutePollUrl, {
          method: "GET",
          headers: { Prefer: `wait=${POLL_WAIT_SECONDS}` },
          signingKey: signingJwk,
          signingCryptoKey: keyPair.privateKey,
          // The poll is signed with the agent_token in every case: it is
          // the agent asking its own PS about a request it made, not a
          // resource call.
          signatureKey: { type: "jwt", jwt: agentToken },
          components: ["@method", "@authority", "@path", "signature-key"]
        });
        const respHeaders = {};
        for (const key of ["retry-after", "aauth-requirement"]) {
          const v = res.headers.get(key);
          if (v) respHeaders[key] = v;
        }
        const body = await res.json().catch(() => null);
        if (cycle === 1) {
          appendStepBody(pollStep, formatResponse(res.status, respHeaders, body));
        } else {
          appendStepBody(
            pollStep,
            `<details class="section-group"><summary class="section-heading"><span>Cycle ${cycle} \u2192 ${res.status}</span>${CHEVRON_SVG}</summary>${formatResponse(res.status, respHeaders, body)}</details>`
          );
        }
        if (res.status === 200) {
          clearPendingAuthorize();
          resolveStep(pollStep, "success", fmt(copy(`${copyPrefix}.ps_pending_longpoll.label_resolved_template`), { path: pollPath, status: 200 }));
          resolveStep(interactionStep, "success", "Interaction Completed");
          pinLog();
          const token = body?.[tokenField];
          if (!options.renderGranted) return token || null;
          addLogStep(
            copy(`${copyPrefix}.authorization_granted.label`),
            "success",
            (token ? formatAuthToken(token) : "") + anotherRequestButton(),
            { kind: "response" }
          );
          return token || null;
        }
        if (res.status === 404) {
          clearPendingAuthorize();
          resolveStep(pollStep, "error", fmt(copy(`${copyPrefix}.ps_pending_longpoll.label_resolved_template`), { path: pollPath, status: 404 }));
          resolveStep(interactionStep, "error", "Interaction Expired");
          pinLog();
          addLogStep(
            "Interaction expired",
            "error",
            formatResponse(404, null, body) + anotherRequestButton(),
            { kind: "response" }
          );
          return null;
        }
        if (res.status === 403 || res.status === 408) {
          clearPendingAuthorize();
          const label = res.status === 403 ? "Interaction Denied" : "Interaction Timed Out";
          resolveStep(pollStep, "error", fmt(copy(`${copyPrefix}.ps_pending_longpoll.label_resolved_template`), { path: pollPath, status: res.status }));
          resolveStep(interactionStep, "error", label);
          pinLog();
          addLogStep(
            copy(res.status === 403 ? `${copyPrefix}.authorization_denied.label` : `${copyPrefix}.authorization_timed_out.label`),
            "error",
            formatResponse(res.status, null, body) + anotherRequestButton(),
            { kind: "response" }
          );
          return null;
        }
      } catch (err) {
        console.log("Poll error:", err.message);
        appendStepBody(
          pollStep,
          `<details class="section-group"><summary class="section-heading"><span>Cycle ${cycle} \u2192 network error</span>${CHEVRON_SVG}</summary><p style="color: var(--error)">${escapeHtml(err.message)}</p></details>`
        );
        await new Promise((r) => setTimeout(r, 5e3));
      }
    }
  }
  function decodeJWTPayloadBrowser(jwt) {
    try {
      const parts = jwt.split(".");
      return JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    } catch {
      return null;
    }
  }
  var NOTES_AUTH_TOKEN_KEY = "aauth-notes-auth-token";
  var _notesHydrated = false;
  var _notesMetadata = null;
  var _notesOperations = [];
  var _notesCache = [];
  async function performNotesDiscovery(logIt) {
    const notesOrigin = window.NOTES_ORIGIN || "https://notes.aauth.dev";
    const metadataUrl = `${notesOrigin}/.well-known/aauth-resource.json`;
    const metadataPath = "/.well-known/aauth-resource.json";
    const metaStep = logIt ? addLogStep(
      fmt(copy("notes.resource_metadata_request.label_template"), { path: metadataPath }),
      "pending",
      desc("notes.resource_metadata_request") + formatRequest("GET", metadataUrl, null, null)
    ) : null;
    let metadata;
    try {
      const res = await fetch(metadataUrl);
      metadata = await res.json().catch(() => null);
      if (!res.ok || !metadata) {
        if (metaStep) {
          resolveStep(metaStep, "error", fmt(copy("notes.resource_metadata_request.label_resolved_template"), { path: metadataPath, status: res.status }));
          appendStepBody(metaStep, formatResponse(res.status, null, metadata));
        }
        return null;
      }
      if (metaStep) {
        resolveStep(metaStep, "success", fmt(copy("notes.resource_metadata_request.label_resolved_template"), { path: metadataPath, status: 200 }));
        appendStepBody(metaStep, formatResponse(200, null, metadata));
      }
    } catch (err) {
      if (metaStep) {
        resolveStep(metaStep, "error", fmt(copy("notes.resource_metadata_request.label_error_network_template"), { path: metadataPath }));
        appendStepBody(metaStep, `<p style="color: var(--error)">${escapeHtml(err.message)}</p>`);
      }
      return null;
    }
    const openapiUrl = metadata.r3_vocabularies?.[window.NOTES_VOCABULARY] || `${notesOrigin}/openapi.json`;
    const openapiPath = new URL(openapiUrl).pathname;
    const oaStep = logIt ? addLogStep(
      fmt(copy("notes.openapi_request.label_template"), { path: openapiPath }),
      "pending",
      desc("notes.openapi_request") + formatRequest("GET", openapiUrl, null, null)
    ) : null;
    let openapi;
    try {
      const res = await fetch(openapiUrl);
      openapi = await res.json().catch(() => null);
      if (!res.ok || !openapi) {
        if (oaStep) {
          resolveStep(oaStep, "error", fmt(copy("notes.openapi_request.label_resolved_template"), { path: openapiPath, status: res.status }));
          appendStepBody(oaStep, formatResponse(res.status, null, openapi));
        }
        return null;
      }
      if (oaStep) {
        resolveStep(oaStep, "success", fmt(copy("notes.openapi_request.label_resolved_template"), { path: openapiPath, status: 200 }));
        appendStepBody(
          oaStep,
          `<details class="section-group"><summary class="section-heading"><span>Response</span>${CHEVRON_SVG}</summary>${formatResponse(200, null, openapi)}</details>`
        );
      }
    } catch (err) {
      if (oaStep) {
        resolveStep(oaStep, "error", fmt(copy("notes.openapi_request.label_error_network_template"), { path: openapiPath }));
        appendStepBody(oaStep, `<p style="color: var(--error)">${escapeHtml(err.message)}</p>`);
      }
      return null;
    }
    return { metadata, openapi };
  }
  async function hydrateNotesOperations() {
    if (_notesHydrated) return;
    const grid = document.getElementById("notes-ops-grid");
    if (!grid) return;
    const result = await performNotesDiscovery(false);
    if (!result) {
      grid.innerHTML = `<p class="scope-caption" style="color: var(--error)">Couldn't fetch notes.aauth.dev metadata. Open the tab again to retry.</p>`;
      return;
    }
    const { metadata, openapi } = result;
    _notesMetadata = metadata;
    const ops = [];
    const paths = openapi.paths || {};
    for (const pKey of Object.keys(paths)) {
      const pObj = paths[pKey];
      for (const method of ["get", "post", "put", "patch", "delete"]) {
        const op = pObj[method];
        if (op?.operationId) {
          ops.push({
            operationId: op.operationId,
            summary: op.summary || op.operationId,
            method: method.toUpperCase(),
            path: pKey
          });
        }
      }
    }
    const order = ["listNotes", "getNote", "createNote", "updateNote", "deleteNote"];
    ops.sort((a, b) => {
      const ia = order.indexOf(a.operationId);
      const ib = order.indexOf(b.operationId);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    _notesOperations = ops;
    const saved = window.aauthGetSavedNotesOperations?.();
    const savedSet = saved ? new Set(saved) : null;
    grid.innerHTML = ops.map((op) => {
      const checked = savedSet ? savedSet.has(op.operationId) : true;
      const title = `${op.method} ${op.path} \u2014 ${op.summary}`.replace(/"/g, "&quot;");
      return `<label class="checkbox-label" title="${title}"><input type="checkbox" value="${escapeHtml(op.operationId)}"${checked ? " checked" : ""}> <span>${escapeHtml(op.operationId)}</span></label>`;
    }).join("");
    window.updateNotesRequestPreview?.();
    _notesHydrated = true;
  }
  window.aauthOnTabActivated = function aauthOnTabActivated(name) {
    if (name === "notes") {
      hydrateNotesOperations().catch((err) => console.error("[aauth] notes hydrate:", err));
    }
  };
  function getSelectedNotesOperations() {
    return Array.from(document.querySelectorAll('#notes-ops-grid input[type="checkbox"]:checked')).map((cb) => ({ operationId: cb.value }));
  }
  async function startNotes() {
    const bindingPs = getBoundPs() || window.getCurrentPS?.();
    if (!bindingPs) {
      alert("No agent token found. Bootstrap first.");
      return;
    }
    setActiveLog("notes-log");
    clearLog();
    showLog();
    document.querySelectorAll("#resource-section .authz-actions").forEach((el) => el.classList.add("hidden"));
    let agentTokenValid = false;
    const savedAgentToken = localStorage.getItem("aauth-agent-token");
    if (savedAgentToken) {
      try {
        const p = decodeJWTPayloadBrowser(savedAgentToken);
        agentTokenValid = p && p.exp > Math.floor(Date.now() / 1e3);
      } catch {
      }
    }
    if (!agentTokenValid) {
      const refreshed = await runRefresh();
      if (!refreshed) return;
    }
    if (!_notesMetadata) {
      await hydrateNotesOperations();
      if (!_notesMetadata) return;
    }
    const operations = getSelectedNotesOperations();
    if (operations.length === 0) {
      addLogSection(copy("sections.notes"));
      addLogStep(
        "No operations selected",
        "error",
        "<p>Check at least one operation before clicking Notes with Hell\u014D.</p>" + anotherRequestButton()
      );
      return;
    }
    const hints = getHints();
    await runNotesAuthorize(operations, bindingPs, hints);
  }
  async function previewR3Document(rtPayload) {
    const r3Uri = rtPayload?.r3_uri;
    if (!r3Uri) return;
    let r3Path = r3Uri;
    try {
      r3Path = new URL(r3Uri).pathname;
    } catch {
    }
    const step = addLogStep(
      fmt(copy("notes.r3_document_request.label_template"), { path: r3Path }),
      "pending",
      desc("notes.r3_document_request") + formatRequest("GET", r3Uri, null, null)
    );
    try {
      const res = await fetch(r3Uri);
      const body = await res.json().catch(() => null);
      resolveStep(
        step,
        res.ok ? "success" : "error",
        fmt(copy("notes.r3_document_request.label_resolved_template"), { path: r3Path, status: res.status })
      );
      appendStepBody(step, formatResponse(res.status, null, body));
    } catch (err) {
      resolveStep(step, "error", fmt(copy("notes.r3_document_request.label_error_network_template"), { path: r3Path }));
      appendStepBody(step, `<p style="color: var(--error)">${escapeHtml(err.message)}</p>`);
    }
  }
  async function runNotesAuthorize(operations, bindingPs, hints) {
    const keyPair = window.aauthEphemeral.get();
    const agentToken = localStorage.getItem("aauth-agent-token");
    if (!keyPair || !agentToken) {
      addLogStep(copy("authorize.missing_context.label"), "error", desc("authorize.missing_context"));
      return;
    }
    const signingJwk = await exportSigningJwk(keyPair.publicKey);
    addLogSection(copy("sections.notes"));
    const discovery = await performNotesDiscovery(true);
    if (!discovery) {
      addLogStep(
        "Notes discovery failed",
        "error",
        "<p>Couldn't fetch metadata or OpenAPI from notes.aauth.dev \u2014 see steps above.</p>" + anotherRequestButton()
      );
      return;
    }
    _notesMetadata = discovery.metadata;
    const authzEndpoint = discovery.metadata.authorization_endpoint || `${window.NOTES_ORIGIN}/authorize`;
    const personResult = await fetchPersonToken({
      resource: new URL(authzEndpoint).origin,
      bindingPs,
      keyPair,
      agentToken,
      signingJwk,
      missionS256: currentMissionS256(),
      consentKey: "notes",
      pendingRecord: { notesAuthorize: true, operations, authzEndpoint }
    });
    if (!personResult) return;
    await continueNotesAuthorize({
      authzEndpoint,
      operations,
      bindingPs,
      hints,
      keyPair,
      agentToken,
      signingJwk,
      personToken: personResult.personToken,
      psMetadata: personResult.psMetadata
    });
  }
  async function continueNotesAuthorize({
    authzEndpoint,
    operations,
    bindingPs,
    hints,
    keyPair,
    agentToken,
    signingJwk,
    personToken,
    psMetadata
  }) {
    const authzPath = new URL(authzEndpoint).pathname;
    const requestBody = {
      r3_operations: {
        vocabulary: window.NOTES_VOCABULARY,
        operations
      }
    };
    const step1 = addLogStep(
      fmt(copy("notes.authorize_request.label_template"), { path: authzPath }),
      "pending",
      desc("notes.authorize_request") + formatRequest("POST", authzEndpoint, {
        "Content-Type": "application/json",
        "Signature-Input": 'sig=("@method" "@authority" "@path" "content-type" "signature-key");created=...',
        "Signature": "sig=:...:",
        "Signature-Key": `sig=jwt;jwt="${personToken?.substring(0, 20)}..."`
      }, requestBody)
    );
    let resourceToken;
    try {
      const res = await (0, import_httpsig.fetch)(authzEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signingKey: signingJwk,
        signingCryptoKey: keyPair.privateKey,
        signatureKey: { type: "jwt", jwt: personToken },
        components: ["@method", "@authority", "@path", "content-type", "signature-key"]
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.resource_token) {
        resourceToken = body.resource_token;
        resolveStep(step1, "success", fmt(copy("notes.authorize_request.label_resolved_template"), { path: authzPath, status: res.status }));
        appendStepBody(step1, formatResponse(res.status, null, body));
        appendStepBody(step1, formatDecoded(decodeJWTPayloadBrowser(resourceToken), "resource_token payload"));
        await previewR3Document(decodeJWTPayloadBrowser(resourceToken));
      } else {
        resolveStep(step1, "error", fmt(copy("notes.authorize_request.label_resolved_template"), { path: authzPath, status: res.status }));
        appendStepBody(step1, formatResponse(res.status, null, body) + anotherRequestButton());
        return;
      }
    } catch (err) {
      resolveStep(step1, "error", fmt(copy("notes.authorize_request.label_error_network_template"), { path: authzPath }));
      appendStepBody(step1, `<p style="color: var(--error)">${escapeHtml(err.message)}</p>` + anotherRequestButton());
      return;
    }
    await runPSTokenExchange({
      resourceToken,
      bindingPs,
      hints,
      keyPair,
      agentToken,
      signingJwk,
      psMetadata,
      labels: {
        postLabel: (path) => fmt(copy("notes.ps_token_request.label_template"), { path }),
        postLabelResolved: (path, status) => fmt(copy("notes.ps_token_request.label_resolved_template"), { path, status }),
        postLabelNetworkError: (path) => fmt(copy("notes.ps_token_request.label_error_network_template"), { path }),
        postDescription: desc("notes.ps_token_request"),
        consentLabel: copy("notes.ps_consent_prompt.label"),
        consentDescription: desc("notes.ps_consent_prompt")
      },
      copyPrefix: "notes",
      consentKey: "notes",
      pendingExtra: { notesAuthorize: true },
      onAuthToken: async (token) => {
        await finalizeNotesAuthToken(token);
      }
    });
  }
  async function finalizeNotesAuthToken(authToken) {
    localStorage.setItem(NOTES_AUTH_TOKEN_KEY, authToken);
    addLogStep(
      copy("notes.auth_token_received.label"),
      "success",
      desc("notes.auth_token_received") + formatDecoded(decodeJWTPayloadBrowser(authToken), "auth_token payload") + anotherRequestButton(),
      { kind: "response" }
    );
    revealNotesApp();
    renderNotesApp();
    if (getGrantedOps().has("listNotes")) await refreshNotesList();
  }
  function getStoredNotesAuthToken() {
    const t = localStorage.getItem(NOTES_AUTH_TOKEN_KEY);
    if (!t) return null;
    try {
      const p = decodeJWTPayloadBrowser(t);
      if (!p || !p.exp || p.exp < Math.floor(Date.now() / 1e3)) return null;
      return t;
    } catch {
      return null;
    }
  }
  function getGrantedOps() {
    const token = getStoredNotesAuthToken();
    if (!token) return /* @__PURE__ */ new Set();
    const payload = decodeJWTPayloadBrowser(token) || {};
    const granted = payload.r3_granted?.operations || [];
    return new Set(granted.map((o) => o.operationId));
  }
  function revealNotesApp() {
    const section = document.getElementById("notes-section");
    if (!section) return;
    const wasHidden = section.classList.contains("hidden");
    section.classList.remove("hidden");
    if (wasHidden) section.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function hideNotesApp() {
    document.getElementById("notes-section")?.classList.add("hidden");
  }
  function renderNotesApp() {
    const app = document.getElementById("notes-app");
    if (!app) return;
    const granted = getGrantedOps();
    if (granted.size === 0) {
      app.innerHTML = '<p class="scope-caption">No operations granted. Click Notes with Hell\u014D to try again.</p>';
      return;
    }
    const parts = [];
    parts.push(`<p class="scope-caption">Granted: ${Array.from(granted).sort().map((o) => `<code>${escapeHtml(o)}</code>`).join(", ")}</p>`);
    if (granted.has("createNote")) {
      parts.push(`
      <div class="notes-create">
        <input type="text" class="notes-input" id="notes-new-title" placeholder="Title" maxlength="512">
        <textarea class="notes-input" id="notes-new-content" placeholder="Content" rows="3" maxlength="1024"></textarea>
        <div class="note-actions">
          <button type="button" class="btn-primary" id="notes-create-btn">Create note</button>
        </div>
      </div>
    `);
    }
    if (granted.has("listNotes")) {
      parts.push(`<div id="notes-list"><p class="scope-caption">Loading\u2026</p></div>`);
    } else {
      parts.push(`<p class="scope-caption">Without <code>listNotes</code> granted, you can only create new notes.</p>`);
    }
    app.innerHTML = parts.join("");
    document.getElementById("notes-create-btn")?.addEventListener("click", async () => {
      const titleEl = document.getElementById("notes-new-title");
      const contentEl = document.getElementById("notes-new-content");
      const title = titleEl.value.trim();
      const content = contentEl.value.trim();
      if (!title || !content) {
        alert("Title and content required.");
        return;
      }
      const created = await callNotesAPI("POST", "/notes", { title, content });
      if (!created) return;
      titleEl.value = "";
      contentEl.value = "";
      if (getGrantedOps().has("listNotes")) await refreshNotesList();
    });
    document.getElementById("notes-list")?.addEventListener("click", notesRowClickHandler);
  }
  async function refreshNotesList() {
    const granted = getGrantedOps();
    if (!granted.has("listNotes")) return;
    const list = await callNotesAPI("GET", "/notes");
    if (!Array.isArray(list)) return;
    _notesCache = list;
    renderNotesList();
  }
  function renderNotesList() {
    const container = document.getElementById("notes-list");
    if (!container) return;
    const granted = getGrantedOps();
    if (_notesCache.length === 0) {
      container.innerHTML = '<p class="scope-caption">No notes yet.</p>';
      return;
    }
    const ctx = { canGet: granted.has("getNote"), canUpdate: granted.has("updateNote"), canDelete: granted.has("deleteNote") };
    container.innerHTML = _notesCache.map((n) => renderNoteRow(n, ctx)).join("");
  }
  function renderNoteRow(note, { canGet, canUpdate, canDelete }) {
    const expiresIn = formatRelativeExpires(note.expires_at);
    const buttons = [];
    if (canGet) buttons.push(`<button type="button" class="btn-outline" data-note-action="view" data-note-id="${escapeHtml(note.id)}">View</button>`);
    if (canUpdate) buttons.push(`<button type="button" class="btn-outline" data-note-action="edit" data-note-id="${escapeHtml(note.id)}">Edit</button>`);
    if (canDelete) buttons.push(`<button type="button" class="btn-outline" data-note-action="delete" data-note-id="${escapeHtml(note.id)}">Delete</button>`);
    return `
    <div class="note-row" data-note-id="${escapeHtml(note.id)}">
      <div class="note-title">${escapeHtml(note.title)}</div>
      <div class="note-content">${escapeHtml(note.content)}</div>
      <div class="note-meta">
        <span>expires ${escapeHtml(expiresIn)}</span>
        <span class="note-actions">${buttons.join("")}</span>
      </div>
    </div>
  `;
  }
  function formatRelativeExpires(expires_at) {
    const secs = expires_at - Math.floor(Date.now() / 1e3);
    if (secs <= 0) return "now";
    const h = Math.floor(secs / 3600);
    const m = Math.floor(secs % 3600 / 60);
    if (h > 0) return `in ${h}h ${m}m`;
    return `in ${m}m`;
  }
  async function notesRowClickHandler(e) {
    const btn = e.target.closest("button[data-note-action]");
    if (!btn) return;
    const action = btn.dataset.noteAction;
    const id = btn.dataset.noteId;
    const row = btn.closest(".note-row");
    const note = _notesCache.find((n) => n.id === id);
    if (!note) return;
    if (action === "view") {
      const fresh = await callNotesAPI("GET", `/notes/${encodeURIComponent(id)}`);
      if (fresh) {
        const i = _notesCache.findIndex((n) => n.id === id);
        if (i !== -1) _notesCache[i] = fresh;
        renderNotesList();
      }
    } else if (action === "edit") {
      startEditRow(row, note);
    } else if (action === "delete") {
      if (!confirm(`Delete "${note.title}"?`)) return;
      const ok = await callNotesAPI("DELETE", `/notes/${encodeURIComponent(id)}`);
      if (ok !== null) {
        _notesCache = _notesCache.filter((n) => n.id !== id);
        renderNotesList();
      }
    }
  }
  function startEditRow(row, note) {
    row.innerHTML = `
    <input type="text" class="notes-input" data-edit-title value="${escapeHtml(note.title)}" maxlength="512">
    <textarea class="notes-input" data-edit-content rows="3" maxlength="1024">${escapeHtml(note.content)}</textarea>
    <div class="note-actions">
      <button type="button" class="btn-primary" data-edit-save>Save</button>
      <button type="button" class="btn-outline" data-edit-cancel>Cancel</button>
    </div>
  `;
    row.querySelector("[data-edit-save]")?.addEventListener("click", async () => {
      const title = row.querySelector("[data-edit-title]").value.trim();
      const content = row.querySelector("[data-edit-content]").value.trim();
      if (!title || !content) {
        alert("Title and content required.");
        return;
      }
      const updated = await callNotesAPI("PUT", `/notes/${encodeURIComponent(note.id)}`, { title, content });
      if (!updated) return;
      const i = _notesCache.findIndex((n) => n.id === note.id);
      if (i !== -1) _notesCache[i] = updated;
      renderNotesList();
    });
    row.querySelector("[data-edit-cancel]")?.addEventListener("click", () => renderNotesList());
  }
  async function callNotesAPI(method, path, body) {
    const authToken = getStoredNotesAuthToken();
    if (!authToken) {
      localStorage.removeItem(NOTES_AUTH_TOKEN_KEY);
      hideNotesApp();
      alert("Notes token expired. Click Notes with Hell\u014D to re-authorize.");
      return null;
    }
    const keyPair = window.aauthEphemeral.get();
    if (!keyPair) return null;
    const signingJwk = await exportSigningJwk(keyPair.publicKey);
    const origin = window.NOTES_ORIGIN || "https://notes.aauth.dev";
    const url = `${origin}${path}`;
    const hasBody = body !== void 0 && body !== null;
    const components = hasBody ? ["@method", "@authority", "@path", "content-type", "signature-key"] : ["@method", "@authority", "@path", "signature-key"];
    const copyKey = method === "GET" && path === "/notes" ? "notes_app.list_request" : method === "POST" ? "notes_app.create_request" : method === "PUT" ? "notes_app.update_request" : method === "DELETE" ? "notes_app.delete_request" : "notes_app.get_request";
    setActiveLog("notes-api-log");
    const apiLog = currentLog();
    if (apiLog && !apiLog.querySelector(":scope > details.log-section")) {
      addLogSection(copy("sections.notes_api"));
    }
    showLog();
    const step = addLogStep(
      fmt(copy(`${copyKey}.label_template`), { path }),
      "pending",
      desc(copyKey) + formatRequest(method, url, {
        ...hasBody ? { "Content-Type": "application/json" } : {},
        "Signature-Input": "sig=(...);created=...",
        "Signature": "sig=:...:",
        "Signature-Key": `sig=jwt;jwt="${authToken.substring(0, 20)}..."`
      }, hasBody ? body : null)
    );
    try {
      const res = await (0, import_httpsig.fetch)(url, {
        method,
        headers: hasBody ? { "Content-Type": "application/json" } : {},
        body: hasBody ? JSON.stringify(body) : void 0,
        signingKey: signingJwk,
        signingCryptoKey: keyPair.privateKey,
        signatureKey: { type: "jwt", jwt: authToken },
        components
      });
      const resBody = res.status === 204 ? null : await res.json().catch(() => null);
      if (res.ok) {
        resolveStep(step, "success", fmt(copy(`${copyKey}.label_resolved_template`), { path, status: res.status }));
        appendStepBody(step, formatResponse(res.status, null, resBody));
        return res.status === 204 ? true : resBody;
      }
      resolveStep(step, "error", fmt(copy(`${copyKey}.label_resolved_template`), { path, status: res.status }));
      appendStepBody(step, formatResponse(res.status, null, resBody));
      if (res.status === 401) {
        localStorage.removeItem(NOTES_AUTH_TOKEN_KEY);
        hideNotesApp();
      }
      return null;
    } catch (err) {
      resolveStep(step, "error", fmt(copy(`${copyKey}.label_error_network_template`), { path }));
      appendStepBody(step, `<p style="color: var(--error)">${escapeHtml(err.message)}</p>`);
      return null;
    }
  }
  async function restoreNotesApp() {
    if (!getStoredNotesAuthToken()) return;
    const notesTabActive = document.querySelector('#resource-section .tab[data-tab="notes"].tab-active');
    if (notesTabActive) revealNotesApp();
    renderNotesApp();
    if (getGrantedOps().has("listNotes")) await refreshNotesList();
  }
  window.aauthRestoreNotesApp = restoreNotesApp;
  document.getElementById("bootstrap-btn")?.addEventListener("click", startBootstrap);
  document.getElementById("whoami-btn")?.addEventListener("click", startWhoami);
  document.getElementById("notes-btn")?.addEventListener("click", startNotes);
  var POPUP_WIDTH = 500;
  var POPUP_HEIGHT = 700;
  document.addEventListener("click", (e) => {
    const helloBtn = e.target.closest(".interaction-actions .hello-btn");
    if (!helloBtn) return;
    e.preventDefault();
    const url = helloBtn.getAttribute("href");
    const left = Math.max(0, Math.round((screen.width - POPUP_WIDTH) / 2));
    const top = Math.max(0, Math.round((screen.height - POPUP_HEIGHT) / 2));
    const features = `popup=yes,width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top}`;
    const popup = window.open(url, "aauth-consent", features);
    if (popup === null) {
      showPopupBlockedMessage(helloBtn);
      return;
    }
  });
  function showPopupBlockedMessage(btn) {
    const container = btn.closest(".interaction-actions");
    if (!container) return;
    if (container.querySelector(".popup-blocked-msg")) return;
    const msg = document.createElement("p");
    msg.className = "popup-blocked-msg";
    msg.textContent = "Popup blocked. Allow popups for this site and click Continue again.";
    container.appendChild(msg);
  }
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".js-scroll-authz");
    if (!btn) return;
    const section = document.getElementById("resource-section");
    if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
    const enclosingLog = btn.closest(".protocol-log");
    if (enclosingLog?.id) setActiveLog(enclosingLog.id);
    setTimeout(clearLog, 300);
    document.querySelectorAll("#resource-section .authz-actions").forEach((el) => el.classList.remove("hidden"));
  });
  async function callDemoResourceApi(authToken) {
    const endpoint = `${window.location.origin}/api/demo`;
    const keyPair = window.aauthEphemeral.get();
    if (!keyPair) {
      addLogStep(
        copy("demo_api.missing_key.label"),
        "error",
        desc("demo_api.missing_key")
      );
      return;
    }
    const reqStep = addLogStep(
      fmt(copy("demo_api.request.label_template"), { path: new URL(endpoint).pathname }),
      "pending",
      desc("demo_api.request") + formatRequest("GET", endpoint, {
        "Signature-Input": 'sig=("@method" "@authority" "@path" "signature-key");created=...',
        "Signature": "sig=:...:",
        "Signature-Key": `sig=jwt;jwt="${authToken?.substring(0, 20)}..."`
      }, null)
    );
    try {
      const signingJwk = await exportSigningJwk(keyPair.publicKey);
      const res = await (0, import_httpsig.fetch)(endpoint, {
        method: "GET",
        signingKey: signingJwk,
        signingCryptoKey: keyPair.privateKey,
        signatureKey: { type: "jwt", jwt: authToken },
        components: ["@method", "@authority", "@path", "signature-key"]
      });
      const body = await res.json().catch(() => null);
      resolveStep(reqStep, res.ok ? "success" : "error", fmt(copy("demo_api.request.label_resolved_template"), { path: "/api/demo", status: res.status }));
      addLogStep(
        copy(res.ok ? "demo_api.success.label" : "demo_api.failure.label"),
        res.ok ? "success" : "error",
        formatResponse(res.status, null, body) + anotherRequestButton()
      );
    } catch (err) {
      resolveStep(reqStep, "error", fmt(copy("demo_api.request.label_error_network_template"), { path: "/api/demo" }));
      addLogStep(
        copy("demo_api.failure.label"),
        "error",
        `<p style="color: var(--error)">${escapeHtml(err.message)}</p>` + anotherRequestButton()
      );
    }
  }
  window.aauthCallDemoResourceApi = callDemoResourceApi;
})();
