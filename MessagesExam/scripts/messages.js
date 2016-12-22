const appKey = 'kid_Sy7q6dc7g';
const appSecret = '21a9a29551a34c60a697f5c1d2085eef';
const kinveyBaseUrl = 'https://baas.kinvey.com/';
const base64MasterAuthorization = {Authorization: 'Basic ' + btoa(`${appKey}:${appSecret}`)};

function startApp() {
    setAjaxLoading();
    renderMenu();
    disableRefreshOnSubmit();
    bindMenuActions();
    bindButtondActions();

    // bind
    //navigation links & Views
    function bindMenuActions() {
        $('#linkMenuAppHome').click(() => showView('viewAppHome'));
        $('#linkMenuRegister').click(() => showView('viewRegister'));
        $('#linkMenuLogin').click(() => showView('viewLogin'));

        $('#linkMenuUserHome').click(() => showView('viewUserHome'));
        $('#linkMenuMyMessages, #linkUserHomeMyMessages').click(() => getMyMessages());
        $('#linkMenuArchiveSent, #linkUserHomeArchiveSent').click(() => getSentMessages());
        $('#linkUserHomeSendMessage, #linkMenuSendMessage').click(() => prepareFormForSend());
        $('#linkMenuLogout').click(() => processLogOut());
    }

    //// Bind form submit buttons
    function bindButtondActions() {
        $('#viewLogin').submit(processLogIn);
        $('#formRegister').submit(processRegister);

        $('#formSendMessage').submit(sendMessage);
    }

    // login
    // logout
    // register
    function processLogIn() {
        let username = $('#formLogin input[name=username]').val();
        let password = $('#formLogin input[name=password]').val();
        $.ajax({
            method: 'POST',
            url: `${kinveyBaseUrl}user/${appKey}/login`,
            headers: base64MasterAuthorization,
            data: JSON.stringify({username, password}),
            contentType: 'application/json'
        }).then(loginSuccess).catch(handleAjaxErrors);

        function loginSuccess(callback) {
            saveAuthInSession(callback);
            setUsername();
            renderMenu();
            showView('viewUserHome');
            showNotifications('infoBox', 'Aloha!');
            ressetForms();
        }
    }

    function processLogOut() {
        $.ajax({
            method: 'POST',
            url: `${kinveyBaseUrl}user/${appKey}/_logout`,
            headers: getKinveyAuth()
        }).then(logOutSuccess).catch(handleAjaxErrors);
        function logOutSuccess() {
            sessionStorage.clear();
            renderMenu();
            showView('viewAppHome');
            showNotifications('infoBox', 'Log out successfully!');
            ressetForms();
        }
    }

    function processRegister() {
        let username = $('#formRegister input[name=username]').val();
        let password = $('#formRegister input[name=password]').val();
        let name = $('#formRegister input[name=name]').val();
        $.ajax({
            method: 'POST',
            url: `${kinveyBaseUrl}user/${appKey}`,
            headers: base64MasterAuthorization,
            data: JSON.stringify({username, password, name}),
            contentType: 'application/json'
        }).then(registerSuccess).catch(handleAjaxErrors);

        function registerSuccess(data) {
            saveAuthInSession(data);
            $('#spanMenuLoggedInUser').text(`Welcome, ${data.username}!`);
            $('#viewUserHomeHeading').text(`Welcome, ${data.username}!`);
            showView('viewUserHome');
            renderMenu();
            showNotifications('infoBox', 'Registration successful !');
            ressetForms();
        }

    }

    //
    //CRUD
    //
    function getMyMessages() {
        $('#myMessages tbody').empty();
        let currentUser = sessionStorage.getItem('username');
        $.ajax({
            method: 'GET',
            url: `${kinveyBaseUrl}appdata/${appKey}/msgs?query={"recipient_username":"${currentUser}"}`,
            headers: getKinveyAuth(),
            contentType: 'application/json'
        }).then(showMsgs).catch(handleAjaxErrors);

        function showMsgs(response) {
            for (let msg of response) {
                let tr = $('<tr>');
                tr.append($('<td>').text(formatSender(msg.sender_name, msg.sender_username)));
                tr.append($('<td>').text(msg.text));
                tr.append($('<td>').text(formatDate(msg._kmd.lmt)));
                $('#myMessages tbody').append(tr);
            }
            showView('viewMyMessages');
        }
    }

    function getSentMessages() {
        let currentUser = sessionStorage.getItem('username');
        $('#sentMessages tbody').empty();
        $.ajax({
            method: 'GET',
            url: `${kinveyBaseUrl}appdata/${appKey}/msgs?query={"sender_username":"${currentUser}"}`,
            headers: getKinveyAuth(),
            contentType: 'application/json'
        }).then(appendAndShowMsgs).catch(handleAjaxErrors);

        function appendAndShowMsgs(response) {
            for (let msg of response) {
                let tr = $('<tr>');
                tr.append($('<td>').text(msg.sender_username));
                tr.append($('<td>').text(msg.text));
                tr.append($('<td>').text(formatDate(msg._kmd.lmt)));
                tr.append($('<td>').append($('<button>').text('Delete').click(() => {
                    deleteMsg(msg._id)
                })));
                $('#sentMessages tbody').append(tr);
            }
            showView('viewArchiveSent');
        }
    }

    function sendMessage() {
        let recipient = $('#msgRecipientUsername').val();
        let msg = $('#formSendMessage input[name=text]').val();
        let data = {
            sender_username: `${sessionStorage.getItem('username')}`,
            sender_name: `${sessionStorage.getItem('name')}`,
            recipient_username: recipient,
            text: msg
        };
        $.ajax({
            method: 'POST',
            url: `${kinveyBaseUrl}appdata/${appKey}/msgs`,
            headers: getKinveyAuth(),
            data: data
        }).then(successSend).catch(handleAjaxErrors);
        function successSend() {
            getSentMessages();
            showNotifications('infoBox', 'Message sent!');
            ressetForms();
        }
    }

    function deleteMsg(id) {
        let request = {
            method: 'DELETE',
            url: `${kinveyBaseUrl}appdata/${appKey}/msgs/${id}`,
            headers: getKinveyAuth(),
            contentType: "application/json"
        };
        $.ajax(request).then(responseAjaxForDelete).catch(handleAjaxErrors);

        function responseAjaxForDelete() {
            getSentMessages();
            showNotifications('infoBox', 'Message successfully deleted!');
        }
    }

    function prepareFormForSend() {
        $('#msgRecipientUsername').empty();
        $.ajax({
            method: 'GET',
            url: `${kinveyBaseUrl}user/${appKey}/`,
            headers: getKinveyAuth(),
            contentType: "application/json"
        }).then(parseUsers).catch(handleAjaxErrors);

        function parseUsers(response) {
            for (let usr of response) {
                let option = $('<option>');
                option.text(formatSender(usr.name, usr.username)).attr('value', usr.username);
                $('#msgRecipientUsername').append(option);
            }
            showView('viewSendMessage');
        }

    }

    //show-hide navigation bar links
    //if user is logged in
    //or not
    function renderMenu() {
        $('div#app > header').find('> a, > span').hide();
        $('#loadingBox, #infoBox, #errorBox').hide();
        if (isLoggedIn()) {
            $('#linkMenuUserHome, #linkMenuMyMessages, #linkMenuArchiveSent, #linkMenuSendMessage, #linkMenuLogout, #spanMenuLoggedInUser').show();
            showView('viewUserHome');
            setUsername();
        }
        else {
            $('#linkMenuAppHome, #linkMenuLogin, #linkMenuRegister').show();
            showView('viewAppHome');
        }
    }

    function showView(view) {
        $('body section').hide();
        $(`#${view}`).show();
    }

    //Notifications:
    // *type - error/info
    // *info type - disappear after 3 seconds, error type - disappear after click
    function showNotifications(typeBox, message) {
        let box = $('#' + typeBox);
        box.text(message);
        box.show();
        if (typeBox === 'infoBox') {
            setTimeout(() => {
                box.fadeOut();

            }, 3000);
        }
        if (typeBox == 'errorBox') {
            box.click(() => {
                box.fadeOut();
            });
        }
    }

    function setAjaxLoading() {
        $(document).on({
            ajaxStart: function () {
                $("#loadingBox").show()
            },
            ajaxStop: function () {
                $("#loadingBox").hide()
            }
        });
    }

    function handleAjaxErrors(error) {
        if (error.readyState === 0) {
            showNotifications('errorBox', 'There is no Internet connection!')
        }
        else if (error.responseJSON.description) {
            showNotifications('errorBox', error.responseJSON.description)
        }
        else {
            console.log(error);
        }
    }

    //
    // Helpers
    //
    function ressetForms() {
        $('form').trigger('reset');
    }

    function saveAuthInSession(data) {
        sessionStorage.setItem('authToken', data._kmd.authtoken);
        sessionStorage.setItem('userId', data._id);
        sessionStorage.setItem('username', data.username);
        sessionStorage.setItem('name', data.name);
    }

    function isLoggedIn() {
        return sessionStorage.getItem('authToken') !== null && sessionStorage.getItem('userId') !== null;
    }

    function setUsername() {
        $('#spanMenuLoggedInUser').text(`Welcome, ${sessionStorage.getItem('username')}!`);
        $('#viewUserHomeHeading').text(`Welcome, ${sessionStorage.getItem('username')}!`);
    }

    function getKinveyAuth() {
        return {Authorization: 'Kinvey ' + sessionStorage.getItem('authToken')};
    }

    function disableRefreshOnSubmit() {
        $('form').submit(function (e) {
            e.preventDefault()
        });
    }

    function formatDate(dateISO8601) {
        let date = new Date(dateISO8601);
        if (Number.isNaN(date.getDate()))
            return '';
        return date.getDate() + '.' + padZeros(date.getMonth() + 1) +
            "." + date.getFullYear() + ' ' + date.getHours() + ':' +
            padZeros(date.getMinutes()) + ':' + padZeros(date.getSeconds());

        function padZeros(num) {
            return ('0' + num).slice(-2);
        }
    }

    function formatSender(name, username) {
        if (!name)
            return username;
        else
            return username + ' (' + name + ')';
    }
}