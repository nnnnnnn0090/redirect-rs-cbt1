rpc.exports.init = function(stage, parameters) {
    const uriCtorPtr = Il2CppHelper.findMethod("System.dll", "System", "Uri", ".ctor", 1);
    if (!uriCtorPtr) {
        console.error("[!] Failed to locate System.Uri::.ctor");
        return;
    }

    console.log("[+] Hooking Uri::.ctor at address:", uriCtorPtr);
    Interceptor.attach(uriCtorPtr, UriRedirector);
    console.log("[+] Redirection initialized. Target: http://127.0.0.1:8099");
};

const REDIRECT_HOST = "http://127.0.0.1:8099";
const REDIRECT_DOMAINS = [
    ".yuanshen.com",
    ".hoyoverse.com",
    ".mihoyo.com",
    ".yuanshen.com:12401"
];
const REDIRECT_URIS = [
    "http://overseauspider.yuanshen.com:8888/log"
];

const UriRedirector = {
    onEnter(args) {
        const originalUrl = args[1].readCSharpString();

        if (shouldRedirect(originalUrl)) {
            const replacedUrl = redirectUrl(originalUrl);
            args[1] = Il2CppApi.allocateString(replacedUrl);
            console.log("[Redirected]:", replacedUrl);
        }
    }
};

function shouldRedirect(url) {
    return REDIRECT_DOMAINS.some(domain => url.includes(domain)) ||
           REDIRECT_URIS.some(uri => url.includes(uri));
}

function redirectUrl(originalUrl) {
    const prefix = originalUrl.split('/', 3).join('/');
    return originalUrl.replace(prefix, REDIRECT_HOST);
}

const Il2CppApi = {
    allocateString(str) {
        const utf16Str = Memory.allocUtf16String(str);
        return this._call('il2cpp_string_new_utf16', 'pointer', ['pointer', 'int'], [utf16Str, str.length]);
    },

    _call(name, retType, argTypes, args) {
        const funcPtr = Module.findExportByName(null, name);
        if (!funcPtr) throw new Error(`[!] Function not found: ${name}`);
        const fn = new NativeFunction(funcPtr, retType, argTypes);
        return fn(...args);
    }
};

const Il2CppHelper = {
    findMethod(imageName, namespace, className, methodName, paramCount) {
        const image = this.getImage(imageName);
        if (!image) return null;

        const clazz = this.getClass(image, namespace, className);
        if (!clazz) return null;

        const method = this.getMethod(clazz, methodName, paramCount);
        if (!method) return null;

        return method.readPointer();
    },

    getImage(name) {
        const domain = Il2CppApi._call('il2cpp_domain_get', 'pointer', [], []);
        const sizePtr = Memory.alloc(8);
        const assemblies = Il2CppApi._call('il2cpp_domain_get_assemblies', 'pointer', ['pointer', 'pointer'], [domain, sizePtr]);
        const count = sizePtr.readU64();

        for (let i = 0; i < count; i++) {
            const assembly = assemblies.add(i * 8).readPointer();
            const image = Il2CppApi._call('il2cpp_assembly_get_image', 'pointer', ['pointer'], [assembly]);
            const imageName = Il2CppApi._call('il2cpp_image_get_name', 'pointer', ['pointer'], [image]);

            if (imageName.readUtf8String() === name) {
                return image;
            }
        }

        return null;
    },

    getClass(image, namespace, className) {
        const nsPtr = Memory.allocUtf8String(namespace);
        const namePtr = Memory.allocUtf8String(className);
        return Il2CppApi._call('il2cpp_class_from_name', 'pointer', ['pointer', 'pointer', 'pointer'], [image, nsPtr, namePtr]);
    },

    getMethod(clazz, methodName, paramCount) {
        const namePtr = Memory.allocUtf8String(methodName);
        return Il2CppApi._call('il2cpp_class_get_method_from_name', 'pointer', ['pointer', 'pointer', 'int'], [clazz, namePtr, paramCount]);
    }
};

NativePointer.prototype.readCSharpString = function () {
    const length = this.add(16).readInt();
    return this.add(20).readUtf16String(length);
};
