if (window.parent && window.parent != window) {
    window.onerror = function (msg, url, lineNo, columnNo, error) {
        if (window.parent.onerror) {
            window.parent.onerror(msg, url, lineNo, columnNo, error);
        }
    }
}
window.addEventListener("message", (e) => {
    // e.data 不一定是自家的 JSON：瀏覽器擴充、vConsole、其他 SDK 都可能往這裡送訊息，
    // 不擋的話 JSON.parse 會丟 SyntaxError（手機開 vConsole 時實際踩到）
    var param;
    try {
        param = JSON.parse(e.data);
    } catch (err) {
        return;
    }
    if (!param) {
        return;
    }
    if (param.method === 'focus') {
        document.querySelector('canvas').focus({ preventScroll: true })
    } else if (param.method === 'blur') {
        document.querySelector('canvas').blur()
    } else if (param.method === 'notify') {
        window.ds.notify(param.data.key, param.data.value);
    }
}, false);

function getHrefURLParams(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

function getUuid() {
    return 'xxxxxxxxxxxxxxxxxxxxxxxx'.replace(
        /[xy]/g,
        // tslint:disable-next-line:ter-prefer-arrow-callback
        function (c) {
            // tslint:disable-next-line:one-variable-per-declaration
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        },
    );
}

function getFetch(url) {
    // Default options are marked with *
    return fetch(url, {
        credentials: 'same-origin', // include, same-origin, *omit
        headers: {
            'content-type': 'application/json',
        },
        method: 'GET', // *GET, POST, PUT, DELETE, etc.
        mode: 'no-cors', // no-cors, cors, *same-origin
        redirect: 'follow', // manual, *follow, error
    });
}

let LOGIN_TOKEN = getLoginToken();

function getLoginToken() {
    const auth = getHrefURLParams('auth');
    let loginToken = { t: '', a: { h: '' } };
    if (auth) {
        const authData = auth.split('.');
        if (authData.length != 3) {
            return { t: '', a: { h: '' } };
        }
        try {
            loginToken = JSON.parse(atob(authData[1]));
        } catch (e) {
            console.error(e);
        }
    } else {
        loginToken.t = getHrefURLParams('token');
        loginToken.a.h = getHrefURLParams('host');
    }
    return loginToken;
}

function getToken() {
    return LOGIN_TOKEN.t
}
function getHost() {
    return LOGIN_TOKEN.a.h
}

function fetchPing(args) {
    let host = getHost();
    if (!host) {
        return;
    }
    let token = getToken();
    let uuid = '';
    const tokens = token.split('.');
    if (tokens.length === 3 &&
        tokens[1].length >= 56 &&
        tokens[2].length >= 8) {
        uuid = tokens[1].slice(40, 56) + tokens[2].slice(0, 8);
    } else {
        uuid = getUuid();
    }

    const ur1 = `https://asia-east2-prod-game-226507.cloudfunctions.net/report?host=${host}&uuid=${uuid}` + (args ? `&${args}` : '');
    console.log('ping', ur1);
    getFetch(ur1);
}

function cocosHandleError(err) {
    if (!err){
        return
    }
    let message = [];
    message.push('Error msg: ' + JSON.stringify(err.message));
    message.push('Error stack: ' + JSON.stringify(err.stack));
    var event = "exception"
    var label = '';
    var category = '';
    var args = { 'description': message.join(' - ') };
    const fetchArgs = `downloadFail=-1`;
    fetchPing(fetchArgs);
    if (window.parent != window) {
        window.parent.postMessage(JSON.stringify({ method: 'report', data: { event, label, category, args } }), '*');
        window.parent.postMessage(JSON.stringify({ method: 'alert', data: { key: 'system.download_error', args: [-1] } }), '*');
        window.parent.postMessage(JSON.stringify({ method: 'analytics', data: { method: 'exception', data: { msg: message.join(' - '), exceptionTime: Date.now() } } }), '*');
    }
    return console.error(err.message, err.stack);
}

// function cocosPipelineTaskProgress(task, done) {
//     task.output = task.input;
//     if (task.progress) {
//         let finish = task.progress.finish
//         let total = task.progress.total
//         if (total) {
//             const percent = Math.round(100 * finish / total);
//             console.log("task.progress", percent, JSON.stringify(task.progress))
//             parent.postMessage(JSON.stringify({ method: "draLoadingUpdateProgress", data: percent }), "*");
//         }
//     }
//     done();
// }

function setLoadingDisplay() {
    // Loading splash scene
    parent.postMessage(JSON.stringify({ method: "draLoadingShow" }), "*");
};

function setProgress(completedCount, totalCount, item) {
    if (totalCount > 1) {
        const percent = Math.round(100 * completedCount / totalCount);
        parent.postMessage(JSON.stringify({ method: "draLoadingUpdateProgress", data: percent }), "*");
    }
};
