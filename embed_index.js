console.log("%cklaus", `font-size: 24px; color: #ff9800; font-weight: 900; padding: 5px; text-shadow: 1px 1px 2px black;`);


encrypt = (text = "", key) => {
    try {
        const encoder = new TextEncoder();
        const textBytes = encoder.encode(text);
        const keyBytes = [...key].map(c => c.charCodeAt(0));
        return [...textBytes].map((b, i) => (b ^ keyBytes[i % keyBytes.length]).toString(16).padStart(2, "0")).join("");
    } catch (error) {
        console.error("Encryption Error:", error);
    };
};

decrypt = (text = "", key) => {
    try {
        const keyBytes = [...key].map(c => c.charCodeAt(0));
        const bytes = text.match(/.{2}/g).map((b, i) => parseInt(b, 16) ^ keyBytes[i % keyBytes.length]);
        const decoder = new TextDecoder();
        return decoder.decode(new Uint8Array(bytes));
    } catch (error) {
        console.error("Decryption Error:", error);
    };
};

bodyEncrypt = (data = {}, key = clientKey) => {
    try {
        data = JSON.stringify({ ...data, date: Date.now() + 3 * 60 * 60 * 1000 });
        const encoder = new TextEncoder();
        const textBytes = encoder.encode(data);
        const keyBytes = [...key].map(c => c.charCodeAt(0));
        return [...textBytes].map((b, i) => (b ^ keyBytes[i % keyBytes.length]).toString(16).padStart(2, "0")).join("");
    } catch (error) {
        console.error("Encryption Error:", error);
    };
};

function formatFileSize(sizeInBytes) {
    sizeInBytes = parseFloat(sizeInBytes);
    if(sizeInBytes >= 1024 * 1024 * 1024) return (sizeInBytes / (1024 * 1024 * 1024)).toFixed(2) + " Gb";
    else if(sizeInBytes >= 1024 * 1024) return (sizeInBytes / (1024 * 1024)).toFixed(2) + " Mb";
    else if(sizeInBytes >= 1024) return (sizeInBytes / 1024).toFixed(2) + " Kb";
    return sizeInBytes + " bayt";
};

function controlImg() {
    $("img[data-imgload='true']").each(function () {
        if ($(this).attr("data-loadstatus") == "true" || !(() => {
            const rect = this.getBoundingClientRect();
            return rect.bottom >= 0 && rect.right >= 0 && rect.top <= (window.innerHeight || document.documentElement.clientHeight) && rect.left <= (window.innerWidth || document.documentElement.clientWidth);
        })() || !$(this).attr("data-src")) return;
        
        $(this)
            .attr("src", $(this).attr("data-src"))
            .css("opacity", 1)
            .attr("data-loadstatus", "true");
    });
};

$(document).on("scroll wheel", controlImg);
controlImg();

$(document).on("input", "[removeWhitespace='true']", e => $(e.target).val($(e.target).val().replace(/\s/g, "")))
$(document).on("input", "[string-and-number='true']", e => e.target.value = e.target.value.replace(/[\u011F\u011E\u0131\u0130\u015F\u015E\u00FC\u00DC]/g, "").replace(/[^a-zA-Z0-9]/g, ""));
$(document).on("input", "[number='true']", e => e.target.value = e.target.value.replace(/\D/g, ""));
$(document).on("input", "[number-and-point='true']", e => e.target.value = e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"));
$(document).on("input", "[nick='true']", e => e.target.value = e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, ""));
$(document).on("input", "[sef='true']", async e => e.target.value = textSef(e.target.value || ""));

function getValue(id) {
    const value = $(id)?.val();
    if(!textCheck({text: value, min: 1})) return undefined;

    return value;
};

function getChecked(id) {
    return $(id)?.is(":checked")? true : false;
};

function getBoolean(id) {
    const value = $(id)?.val();
    return value == "1";
};

request = async (data) => {
    let table = {
        type: data.TYPE == "post"? "POST": "GET",
        dataType: "json",
        contentType: "application/json",
        url: data.URL,
        data: {
            ...(data.BODY || {}),
            answer_encrypt: data.ANSWER_ENCRYPT === true? "1" : "0"
        }
    };

    if(data.BODY_ENCRYPT) table.data = {d: bodyEncrypt(table.data, clientKey)};

    table.data = JSON.stringify(table.data);
    let apiReq = await $.ajax(table).catch(err => console.log(table, err));
    
    if(data.ANSWER_ENCRYPT && apiReq?.encrypt) {
        if(!textCheck({text: apiReq?.d, min: 1})) return {isError: true, msg: "Dönecek veri kümesi bulunamadı."};
        
        try {
            apiReq = JSON.parse(decrypt(apiReq.d, clientKey));
        } catch (error) {
            return {isError: true, msg: "Dönecek veri kümesi çözülürken sorun oluştu."};
        };
    };

    if(!apiReq || apiReq.isError) return {isError: true, msg: apiReq?.msg || "Bir sorunla karşılaştık. Daha sonra tekrar dene."};

    return apiReq;
};

var isDragging = false;
var draggedRow = null;

$(document).on("mousedown touchstart", ".sortable-table td", function(event) {
    event.preventDefault();

    isDragging = true;
    draggedRow = $(this).closest("tr");

    $(this).addClass("dragging");
});

$(document).on("mouseup touchend", function() {
    if(isDragging) {
        isDragging = false;
        draggedRow = null;

        $(".sortable-table td").removeClass("dragging");
    };
});

$(document).on("mousemove touchmove", function(event) {
    if(isDragging) {
        var targetRow = $(event.target).closest("tr");

        if(targetRow.length > 0 && targetRow[0] !== draggedRow[0]) {
            if(targetRow.index() < draggedRow.index()) targetRow.before(draggedRow);
            else targetRow.after(draggedRow);
            
            Cache_TableLeaderList = $(".sortable-table").html();
        };
    };
});

getTrTime = () => {
    const date = new Date().toLocaleString("en-US", {timeZone: "Europe/Istanbul"});
    return Math.floor(new Date(date).getTime());
};

removePunctuation = str => str?.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"\[\]\\]/g, "")?.toUpperCase();
removeSpaces = str => str?.replace(/\s+/g, "");
textShort = (t, l) => t ? t.slice(0, l) + (t.length > l ? ".." : "") : "";
textOrEmptyString = text => (text || "");
textSef = text => (text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "").replace(/--+/g, "-");
passwordCheck = text => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{7,32}$/.test(text);
textEmail = t => /^[\x00-\x7F]+$/.test(t=t?.toLowerCase().trim()) ? t : null;
textNick = text => (text || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]/g, "").replace(/\s+/g, "");

textCheck = ({text = "", not_req, min, max, number} = {}) => {
    try {
        if(String(text) !== "0") text = String(text || "").trim();
        if(not_req && text.length < 1) min = max = number = undefined;
        return !((min && text.length < min) || (max && text.length > max) || (number && isNaN(text)));
    } catch (error) {
        console.error(error);
        return false;
    };
};

months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
unitsTimes = [
    {unit: "yıl", factor: 365 * 24 * 60 * 60 * 1000},
    {unit: "ay", factor: 30 * 24 * 60 * 60 * 1000},
    {unit: "gün", factor: 24 * 60 * 60 * 1000},
    {unit: "saat", factor: 60 * 60 * 1000},
    {unit: "dakika", factor: 60 * 1000},
    {unit: "saniye", factor: 1000},
    {unit: "millisaniye", factor: 1}
];

unixToString = async (data) => {
    try {
        let currentDate = new Date();
        let timeDate = new Date(parseInt(data.TIME));
        let outText;
      
        const timeDifference = currentDate - timeDate;

        if(data.TYPE === 0) outText = `${timeDate.getDate()} ${months[timeDate.getMonth()]} ${timeDate.getFullYear()}`;
        else if(data.TYPE === 1) outText = `${timeDate.getDate()} ${months[timeDate.getMonth()]} ${timeDate.getFullYear()}, ${(timeDate.getHours() < 10 ? "0" : "") + timeDate.getHours()}:${(timeDate.getMinutes() < 10 ? "0" : "") + timeDate.getMinutes()}`;
        else if(data.TYPE === 2) {    
            if(timeDifference < 1000) outText = "Şimdi";
            else if(timeDifference < 60 * 1000) outText = `${Math.floor(timeDifference / 1000)} saniye`;
            else if(timeDifference < 60 * 60 * 1000) outText = `${Math.floor(timeDifference / (60 * 1000))} dakika`;
            else if(timeDifference < 24 * 60 * 60 * 1000) outText = `${Math.floor(timeDifference / (60 * 60 * 1000))} saat`;
            else if(timeDifference < 30 * 24 * 60 * 60 * 1000) outText = `${Math.floor(timeDifference / (24 * 60 * 60 * 1000))} gün`;
            else if(timeDifference < 365 * 24 * 60 * 60 * 1000) outText = `${Math.floor(timeDifference / (30 * 24 * 60 * 60 * 1000))} ay`;
            else outText = `${Math.floor(timeDifference / (365 * 24 * 60 * 60 * 1000))} yıl`;
        }
        else if(data.TYPE === 3) {    
            if(timeDifference < 1000) outText = "Şimdi";
            else if(timeDifference < 60 * 1000) outText = `${Math.floor(timeDifference / 1000)} saniye önce`;
            else if(timeDifference < 60 * 60 * 1000) outText = `${Math.floor(timeDifference / (60 * 1000))} dakika önce`;
            else if(timeDifference < 24 * 60 * 60 * 1000) outText = `${Math.floor(timeDifference / (60 * 60 * 1000))} saat önce`;
            else if(timeDifference < 30 * 24 * 60 * 60 * 1000) outText = `${Math.floor(timeDifference / (24 * 60 * 60 * 1000))} gün önce`;
            else if(timeDifference < 365 * 24 * 60 * 60 * 1000) outText = `${Math.floor(timeDifference / (30 * 24 * 60 * 60 * 1000))} ay önce`;
            else outText = `${Math.floor(timeDifference / (365 * 24 * 60 * 60 * 1000))} yıl önce`;
        }
        else if(data.TYPE === 4) {
            for (let i = 0; i < unitsTimes.length; i++) {
                const {unit, factor} = unitsTimes[i];
                if(parseInt(data.TIME) >= factor) {
                    const value = Math.floor(parseInt(data.TIME) / factor);
                    outText = `${value} ${unit}`;
                    break;
                };
            };
        }
        else if(data.TYPE === 5) {
            const remainingTime = data.TIME - (new Date().getTime() - data.CREATED);
            if(remainingTime <= 0) outText = "Süresi Bitti";
            else {
                const seconds = Math.floor(remainingTime / 1000) % 60;
                const minutes = Math.floor(remainingTime / (1000 * 60)) % 60;
                const hours = Math.floor(remainingTime / (1000 * 60 * 60)) % 24;
                const days = Math.floor(remainingTime / (1000 * 60 * 60 * 24)) % 365;
                const years = Math.floor(remainingTime / (1000 * 60 * 60 * 24 * 365));
                const parts = [];

                if(years > 0) parts.push(`${years} yıl`);
                if(days > 0) parts.push(`${days} gün`);
                if(hours > 0) parts.push(`${hours} saat`);
                if(minutes > 0) parts.push(`${minutes} dakika`);
                if(seconds > 0) parts.push(`${seconds} saniye`);
                outText = parts.slice(0, 2).join(" ");
                if(years > 50 && data.INFINITY) outText = "Sonsuz";
            };
        }
        else if(data.TYPE === 6) outText = `${timeDate.getDate()} ${months[timeDate.getMonth()]} ${timeDate.getFullYear()}`;
        else if(data.TYPE === 7) outText = timeDate.toLocaleDateString('tr-TR', {day: '2-digit', month: 'short', year: 'numeric'});
      
        return outText;
    } catch (error) {
        console.error(error);
    };
};async function artPlayer_dataSet() {
    _.quality_value = parseFloat(localStorage.getItem("art_quality") || 1080);
    _.sound_group_value = localStorage.getItem("art_sound") || _.data.groups[0].group;
    _.subtitle_group_value = localStorage.getItem("art_subtitle") || _.data.subtitles?.[0]?.group;

    _.sound_group = await _.data.groups.find(x => x.group == _.sound_group_value) || _.data.groups[0];
    _.selected_video = await _.sound_group.items.find(x => x.quality === _.quality_value) || _.sound_group.items.sort((a, b) => b.quality - a.quality)[0];

    _.subtitle_closed = localStorage.getItem("art_subtitle_show") == "false";
    _.subtitle_group = await _.data.subtitles.find(x => x.group == _.subtitle_group_value) || _.data.subtitles?.[0];

    _.video_speed = parseFloat(localStorage.getItem("art_video_speed") || 1.0);

    return true;
};

function artPlayer_eventFullScreen() {
    player.on("fullscreen", () => {
        const status = player.fullscreen;

        // Mobilde "Sezonlar" ikonunu gizliyoruz.
        if(_?.data?.content?.type == "series") player.__seasonsBtn.style.display = (_.is_mobile && !status)? "none" : "flex";

        const contentName = $("#content_name"); // Mobilde İçerik başlığını gizliyoruz.
        const nextForwardButton = $("#next_forward_button"); // Mobilde Geri sar butonunu gizliyoruz.
        const rewindButton = $("#rewind_button"); // Mobilde İleri sar butonunu gizliyoruz.

        if(_.is_mobile && !status) {
            contentName.hide();
            nextForwardButton.hide();
            rewindButton.hide();
        } else {
            contentName.show();
            nextForwardButton.show();
            rewindButton.show();
        };
    });
};

document.addEventListener("keydown", (e) => {
    if(_.skin !== "art") return;
    if(["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;

    const hotkeyMap = {
        'f': () => player.fullscreen = !player.fullscreen,
        'F': () => player.fullscreen = !player.fullscreen,
        'm': () => player.muted = !player.muted,
        'M': () => player.muted = !player.muted,
        'k': () => player.toggle(),
        'K': () => player.toggle(),
        ' ': () => player.toggle(), // Space
        'j': () => player.currentTime -= parseFloat(_.player_settings.forward_backward),
        'J': () => player.currentTime -= parseFloat(_.player_settings.forward_backward),
        'l': () => player.currentTime += parseFloat(_.player_settings.forward_backward),
        'L': () => player.currentTime += parseFloat(_.player_settings.forward_backward),
        'c': () => player.subtitle.show = !player.subtitle.show,
        'C': () => player.subtitle.show = !player.subtitle.show,
        'ArrowLeft': () => player.currentTime -= parseFloat(_.player_settings.forward_backward),
        'ArrowRight': () => player.currentTime += parseFloat(_.player_settings.forward_backward),
        'ArrowUp': () => player.volume = Math.min(player.volume + 0.1, 1),
        'ArrowDown': () => player.volume = Math.max(player.volume - 0.1, 0),
    };
    
    const handler = hotkeyMap[e.key];
    if(handler) {
        e.preventDefault();
        handler();
    };
    
    // Sayı tuşları için özel işlem
    if(e.key >= "0" && e.key <= "9" && _.player_settings.number_key_seek) {
        e.preventDefault();
        const percent = parseInt(e.key) * 10;
        player.currentTime = (player.duration * percent) / 100;
    };
});

function artPlayer_eventMobileClickHandler() {
    // mobilde ekranın ortasına alttaki bar açıkken basınca video start-stop

    player.layers.add({
        name: "mobile-click-handler",
        html: "",
        style: {
            position: "absolute",
            top: "25%",
            left: "25%",
            width: "50%",
            height: "50%",
            zIndex: 10
        },
        click: function () {
            const isControlsVisible = player.template.$player.classList.contains("art-hover");

            if(isControlsVisible) player.toggle();
            else player.controls.show = true;
        }
    });
};

function artPlayer_eventPlaying() {
    player.on("video:playing", () => {
        if(!_.first_start) {
            _.first_start = true;

            if(_.player_settings.playing_auto_fullscreen) player.fullscreen = true;

            player.playbackRate = parseFloat(_.video_speed);
        };
    });
};

function artPlayer_eventReady() {
    player.on("ready", () => {
        player.subtitle.show = !_.subtitle_closed;

        setInterval(() => {
            if(!_.set_time) return;

            player.currentTime = parseFloat(_.set_time);
            _.set_time = undefined;""
        }, 200);""

        setInterval(() => {
            const getTime = player.currentTime;
            if(isNaN(getTime)) return;
            
            window.parent.postMessage({ID: "player", type: "current_time", time: getTime}, "*");
        }, 1 * 60 * 1000);

        /*
        //ses boost
        try {
            const video = player.video;
        
            const audioContext = new AudioContext();
            const sourceNode = audioContext.createMediaElementSource(video);
            const gainNode = audioContext.createGain();
            gainNode.gain.value = 1.0;
            
            sourceNode.connect(gainNode).connect(audioContext.destination);
            
            player.audioCtx = audioContext;
            player.gainNode = gainNode;
            
            player.on("volume", (volume) => {
                gainNode.gain.value = volume * 2;
                video.volume = 1.0;
            });
            
            gainNode.gain.value = player.volume * 2;
            video.volume = 1.0;

            console.log("Ses boost aktif.");
        } catch (error) {
            console.error(error);
        };
        */
    });
};

function artPlayer_eventSubtitlePosition() {
    const subtitleEl = player.template.$subtitle;
    if(!subtitleEl) return;

    let isUpdating = false; // Çoklu tetiklenmeyi önle

    const observer = new MutationObserver(() => {
        if(isUpdating) return;
        isUpdating = true;
        
        requestAnimationFrame(() => {
            updateSubtitlePositions();
            isUpdating = false;
        });
    });

    observer.observe(subtitleEl, {
        childList: true,
        subtree: true,
        characterData: true
    });

    function updateSubtitlePositions() {
        let topOffset = 5;
        const lineSpacing = 6;

        $(subtitleEl).find(".art-subtitle-line").each(function() {
            const lineHtml = $(this).html();
            const lineText = $(this).text()?.trim();

            let row = "null";
            const rowMatch = lineHtml.match(/<line\s+[^>]*r="(\d+)"[^>]*>/i);
            if(rowMatch?.[1]) row = parseFloat(rowMatch[1]);

            const lineFind = _.subtitle_data.find(x => x.row === row || x.text?.includes(`\n${lineText}`));
            //const lineFind = _.subtitle_data.find(x => x.row === row || lineText?.includes(x.text) || x.text?.includes(lineText));

            if(lineFind?.position === "margin_top") {
                $(this).css({
                    position: "fixed", 
                    top: `${topOffset}%`, 
                    bottom: "auto",
                    transition: "none",
                    willChange: "auto" // gpu hızlandırmayı kapatıyoruz
                });

                topOffset += lineSpacing;
            } else if (_.subtilte_style?.position !== "top") {
                $(this).css({position: "", top: "", bottom: ""});
            };
        });
    };
};

/*
function artPlayer_eventSubtitlePosition() {
    player.on("video:timeupdate", () => {
        const subtitleEl = player.template.$subtitle;
        if(!subtitleEl) return;

        let topOffset = 5;
        const lineSpacing = 6;

        $(subtitleEl).find(".art-subtitle-line").each(function() {
            const lineHtml = $(this).html();
            const lineText = $(this).text();

            let row = "null";
            const rowMatch = lineHtml.match(/<line\s+[^>]*r="(\d+)"[^>]*>/i);
            if(rowMatch?.[1]) row = rowMatch[1];

            const lineFind = _.subtitle_data.find(x => x.row === row || lineText?.includes(x.text) || x.text?.includes(lineText));

            if(lineFind?.position === "margin_top") {
                $(this).css({position: "fixed", top: `${topOffset}%`, bottom: "auto"});
                topOffset += lineSpacing;
            } else if (_.subtilte_style?.position !== "top") {
                $(this).css({position: "", top: "", bottom: ""});
            };
        });
    });
};
*/

/*
player.on("video:timeupdate", () => {
    const subtitleEl = player.template.$subtitle;
    if(!subtitleEl) return;
    const html = subtitleEl.innerHTML;
    if(!html) return;
    
    const match = html.match(/<line\s+[^>]*r="(\d+)"[^>]*>/i);
    if(lineFind?.position == "margin_top") subtitlePositionSet("top");
    else if(_.subtilte_style?.position !== "top") subtitlePositionSet("bottom");
});
*/

function artPlayer_eventSwitchVideo() {
    player.on("video:loadstart", async (item) => {
        const videoUrl = player.url || player.video.src;
        const videoFind = await _.all_links.find(x => x.link == videoUrl);

        if(videoFind) {
            localStorage.setItem("art_quality", videoFind.quality);
            localStorage.setItem("art_sound", videoFind.group);
        };
    });
};

function artPlayer_eventTimeUpdate() {
    player.on("video:timeupdate", () => {
        const currentTime = Math.floor(player.currentTime);

        if(_.data?.content?.opening?.start && _.data?.content?.opening?.end) {
            const start = toSec(_.data?.content?.opening?.start);
            const end = toSec(_.data?.content?.opening?.end);
            
            const buttonElement = $(".skip-btn");

            if(currentTime >= start && currentTime <= end && !_.opening_skip) {
                buttonElement.show();

                if(_.player_settings.opening_auto_skip) skipOpening();
            } else {
                buttonElement.hide();
            };
        };

        if(_.data?.content?.next_episode) {
            const start = toSec(_.data?.content?.next_episode);
            const buttonElement = $(".ending-btn");

            if(currentTime >= start && currentTime <= _.data.content.next_episode_end && !_.ending_skip) {
                buttonElement.show();

                if(_.player_settings.opening_auto_skip) skipEnding();
            } else {
                buttonElement.hide();
            };
        };

        if(_.data?.content?.finish && _.data?.content?.next_episode_data) {
            const start = toSec(_.data?.content?.finish);
            const end = toSec(_.data?.content?.finish) + 120;
            const buttonElement = $(".next-btn");

            if(currentTime >= start && currentTime <= end) {
                buttonElement.show();

                if(_.player_settings.next_auto_skip) nextEpisodeTarget();
            } else {
                buttonElement.hide();
            };
        };
    });
};

function artPlayer_eventTouchend() {
    // mobilde sağ-sol çift tıklayınca ileri geri

    let lastTap = 0;
    let tapTimeout;

    player.template.$video.addEventListener('touchend', (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        
        // çift tıklama kontrolü (300ms içinde)
        if(tapLength < 300 && tapLength > 0) {
            clearTimeout(tapTimeout);
            
            const touch = e.changedTouches[0];
            const videoWidth = player.template.$video.offsetWidth;
            const touchX = touch.clientX - player.template.$video.getBoundingClientRect().left;
            
            if(touchX < videoWidth / 2) {
                player.seek = Math.max(0, player.currentTime - parseFloat(_.player_settings.forward_backward));
                showFeedback(`« ${_.player_settings.forward_backward}s`, "left");
            } else {
                player.seek = Math.min(player.duration, player.currentTime + parseFloat(_.player_settings.forward_backward));
                showFeedback(`${_.player_settings.forward_backward}s »`, "right");
            };
            
            e.preventDefault();
        };
        
        lastTap = currentTime;
    });

    function showFeedback(text, side) {
        const feedback = document.createElement("div");
        feedback.textContent = text;
        feedback.style.cssText = `
            position: absolute;
            top: 50%;
            ${side}: 20px;
            transform: translateY(-50%);
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-size: 24px;
            font-weight: bold;
            z-index: 1000;
            pointer-events: none;
            animation: fadeOut 0.5s ease-out;
        `;
        
        player.template.$player.appendChild(feedback);
        
        setTimeout(() => feedback.remove(), 500);
    };

    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeOut {
            0% { opacity: 1; transform: translateY(-50%) scale(1); }
            100% { opacity: 0; transform: translateY(-50%) scale(0.8); }
        }
    `;
    document.head.appendChild(style);
};

window.addEventListener("message", async function (event) {
    if(!event || !event.data || _.skin !== "art") return;

    if(event.data.ID == "player_panel" && event.data.type == "set_time" && event.data.time) {
        _.set_time = event.data.time;
    };

    if(event.data.ID == "player_panel" && event.data.type == "player_settings" && event.data.config) {
        if(event.data.config == "opening_auto_skip") artPlayer_playerSettings_introChange(event.data.status);
        else if(event.data.config == "next_auto_skip") artPlayer_playerSettings_nextEpisodeChange(event.data.status);
        else if(event.data.config == "playing_auto_fullscreen") artPlayer_playerSettings_fullScreen(event.data.status);

        artPlayer_playerSettingsTrigger();
    };
});

async function artPlayer(data) {
    _.data = data;
    _.data.seasons = _.data.seasons || [];
    _.open_season = parseFloat(_.season);

    _.is_mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    $("body").html(`<div id="player" style="width: 100%; height: 100%; border: none; position: inherit;"></div>`);

    await scriptLinkAdder("https://unpkg.com/artplayer/dist/artplayer.js");
    await scriptLinkAdder("https://cdn.jsdelivr.net/npm/hls.js@latest");

    $("head").append(`<link rel="stylesheet" href="${_.test? `https://mehmet-pc.metin2games.com/artplayer.css?v=${Math.floor(Math.random() * (9999999 - 1000 + 1)) + 1000}` : "/assets/skin/artplayer.css?v=2"}"/>`);
    
    _.all_links = _.data.groups.flatMap(group => group.items.map(item => ({...item, group: group.group})));

    _.subtitle_colors = [
        {hex: "#fff", name: _.lang == "tr"? "Beyaz" : "White"},
        {hex: "#FFFF00", name: _.lang == "tr"? "Sarı" : "Yellow"},
        {hex: "#00FF00", name: _.lang == "tr"? "Yeşil" : "Green"},
        {hex: "#FF7F00", name: _.lang == "tr"? "Turuncu" : "Orange"},
        {hex: "#bebebe", name: _.lang == "tr"? "Gri" : "Gray"},
        {hex: "#de0a26", name: _.lang == "tr"? "Kırmızı" : "Red"}
    ];

    _.subtitle_fonts = [
        {name: "Arial", value: "Arial, Helvetica, sans-serif"},
        {name: "Times New Roman", value: "'Times New Roman', Times, serif"},
        {name: "Courier New", value: "'Courier New', Courier, monospace"},
        {name: "Georgia", value: "Georgia, serif"},
        {name: "Verdana", value: "Verdana, Geneva, sans-serif"},
        {name: "Tahoma", value: "Tahoma, Geneva, sans-serif"},
        {name: "Palatino", value: "Palatino, 'Palatino Linotype', 'Book Antiqua', serif"},
        {name: "Comic Sans MS", value: "'Comic Sans MS', cursive, sans-serif"},
        {name: "Trebuchet MS", value: "'Trebuchet MS', sans-serif"},
        {name: "Garamond", value: "Garamond"}
    ];

    $("<style>").text(`
        .skip-btn {
            position: absolute !important;
            right: 50px !important;
            bottom: 80px !important;
            padding: 8px 16px;
            background: #fff;
            color: #000;
            border-radius: 5px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 400;
            font-family: monospace;
            transition: all 0.2s ease;
        }
        .skip-btn:hover {
            background: #f7f3f3;
            transform: scale(1.05);
        }
        .skip-btn:active {
            transform: scale(0.98);
        }

        .next-btn {
            position: absolute !important;
            right: 50px !important;
            bottom: 80px !important;
            padding: 8px 16px;
            background: #fff;
            color: #000;
            border-radius: 5px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 400;
            font-family: monospace;
            transition: all 0.2s ease;
        }
        .next-btn:hover {
            background: #f7f3f3;
            transform: scale(1.05);
        }
        .next-btn:active {
            transform: scale(0.98);
        }

        .ending-btn {
            position: absolute !important;
            right: 50px !important;
            bottom: 80px !important;
            padding: 8px 16px;
            background: #fff;
            color: #000;
            border-radius: 5px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 400;
            font-family: monospace;
            transition: all 0.2s ease;
        }
        .ending-btn:hover {
            background: #f7f3f3;
            transform: scale(1.05);
        }
        .ending-btn:active {
            transform: scale(0.98);
        }

        .art-highlight-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10;
        }

        .art-highlight-range {
            position: absolute;
            top: 20%;
            height: 25%;
            cursor: pointer;
            pointer-events: auto;
            opacity: 0.4;
            transition: all 0.2s ease;
            border-radius: 2px;
        }

        .art-highlight-range:hover {
            opacity: 0.6;
            filter: brightness(1.2);
        }

        .art-highlight-tooltip {
            position: absolute;
            bottom: calc(100% + 12px);
            left: 50%;
            transform: translateX(-50%) scale(0.9);
            background: rgba(0, 0, 0, 0.95);
            color: #fff;
            padding: 8px 12px;
            border-radius: 6px;
            white-space: nowrap;
            opacity: 0;
            visibility: hidden;
            transition: all 0.2s ease;
            pointer-events: none;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .tooltip-title {
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 4px;
        }

        .tooltip-time {
            font-size: 11px;
            opacity: 0.8;
            font-family: monospace;
        }

        .art-highlight-tooltip::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 6px solid transparent;
            border-top-color: rgba(0, 0, 0, 0.95);
        }

        .art-highlight-range:hover .art-highlight-tooltip {
            opacity: 1;
            visibility: visible;
            transform: translateX(-50%) scale(1);
        }

        .art-highlight-range[data-text*="Opening"],
        .art-highlight-range[data-text*="OP"] {
            background-color: #00e676 !important;
        }

        .art-highlight-range[data-text*="Ending"],
        .art-highlight-range[data-text*="ED"] {
            background-color: #ff4081 !important;
        }

        .art-icon-seasons {
            width: 22px;
            height: 22px;
        }

        .seasons-panel {
            background: rgba(0, 0, 0, 0.95);
            color: #fff;
            padding: 20px;
            overflow: visible;
        }

        .seasons-panel::-webkit-scrollbar {
            display: none;
        }

        .season-item {
            padding: 12px;
            margin: 8px 0;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            justify-content: space-between;
            align-items: center;
            -webkit-tap-highlight-color: transparent;
        }

        .season-item:hover,
        .season-item:active {
            background: rgba(255, 255, 255, 0.2);
        }

        .episode-list {
            margin-top: 10px;
            padding-left: 20px;
            padding-right: 10px;
            max-height: 400px;
            overflow-y: auto;
            overflow-x: hidden;
            -webkit-overflow-scrolling: touch;
        }

        .episode-list::-webkit-scrollbar {
            width: 12px;
        }

        .episode-list::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            margin: 4px 0;
        }

        .episode-list::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.4);
            border-radius: 4px;
            min-height: 40px;
            border: 2px solid transparent;
            background-clip: padding-box;
        }

        .episode-list::-webkit-scrollbar-thumb:hover,
        .episode-list::-webkit-scrollbar-thumb:active {
            background: rgba(255, 255, 255, 0.6);
            background-clip: padding-box;
        }

        .episode-item {
            padding: 10px 12px;
            margin: 5px 0;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.3s;
            -webkit-tap-highlight-color: transparent;
            min-height: 44px;
            display: flex;
            align-items: center;
        }

        .episode-item:hover,
        .episode-item:active {
            background: rgba(255, 255, 255, 0.15);
        }

        .episode-item.active {
            background: red;
        }

        .season-arrow {
            transition: transform 0.3s;
            display: inline-block;
        }

        .season-arrow.open {
            transform: rotate(90deg);
        }

        .art-control-seasons.art-control-active {
            background: rgba(255, 0, 0, 0.3);
        }

        .art-control-seasons.art-control-active .art-icon-seasons {
            fill: red;
        }

        /* Mobil cihazlar için optimizasyon */
        @media (max-width: 768px) {
            .seasons-panel {
                padding: 15px;
            }
            
            .season-item {
                padding: 14px 12px;
                margin: 10px 0;
            }
            
            .episode-list {
                padding-left: 15px;
                padding-right: 8px;
                margin-top: 8px;
                max-height: 300px;
            }
            
            .episode-list::-webkit-scrollbar {
                width: 8px;
            }
            
            .episode-item {
                padding: 12px 10px;
                margin: 6px 0;
                min-height: 48px;
            }
        }

        /* Çok küçük ekranlar için */
        @media (max-width: 480px) {
            .seasons-panel {
                padding: 12px;
            }
            
            .episode-list {
                padding-left: 10px;
                max-height: 250px;
            }
        }
    `).appendTo("head");

    await artPlayer_dataSet();

    let highlights = [];

    if(_.data?.content?.opening?.start && _.data?.content?.opening?.end) {
        highlights.push({start: toSec(_.data.content.opening.start), end: toSec(_.data.content.opening.end), text: "Opening", color: "#00e676"});
    };

    if(!_.data?.content?.finish && _.data?.content?.next_episode) {
        /*
            Eğer "finish" süresi yok ise ve "ending_start" süresi var ise ending_startın süresini finish ile değiştirip
            endigni gizliyoruz.
        */

        _.data.content.finish = _.data?.content?.next_episode;
        _.data.content.next_episode = undefined;
    };

    if(_.data?.content?.next_episode) {
        const nextEpisode = toSec(_.data?.content?.next_episode);
        _.data.content.next_episode_end = _.data.content.next_episode_end? toSec(_.data.content.next_episode_end) : nextEpisode + 90;

        highlights.push({start: nextEpisode, end: _.data.content.next_episode_end, text: "Ending", color: "#ff4081"});
    };

    if(_.data?.content?.finish) {
        const finish = toSec(_.data?.content?.finish);
        const end = finish + 20;

        highlights.push({start: finish, end: end, text: "Next Episode", color: "#4083ffff"});
    };

    player = new Artplayer({
        container: "#player",
        url: _.selected_video.link,
        type: _.sound_group.type == "hls"? "m3u8" : "mp4",
        poster: "/assets/index/img/bg-anime.png",
        volume: 1,
        setting: true,
        fullscreen: true,
        autoOrientation: true,
        miniProgressBar: true,
        backdrop: true,
        playsInline: true,
        miniProgressBar: false,
        hotkey: false,
        aspectRatio: true,
        theme: "red",
        lang: navigator.language.toLowerCase(),
        moreVideoAttr: {crossOrigin: "anonymous"},
        layers: [
            {
                html: `<button class="skip-btn" style="display: none;">${_.lang == "tr"? "İntroyu Atla" : "Skip Intro"}</button>`,
                click: function() {
                    skipOpening();
                }
            },
            {
                html: `<button class="ending-btn" style="display: none;">${_.lang == "tr"? "Endingi Atla" : "Skip Outro"}</button>`,
                click: function() {
                    skipEnding();
                }
            },
            {
                html: `<button class="next-btn" style="display: none;">${_.lang == "tr"? "Sonraki Bölüm" : "Next Episode"}</button>`,
                click: function() {
                    nextEpisodeTarget();
                }
            }
        ],
        subtitle: {
            escape: false,
            type: "vtt", 
            encoding: "utf-8"
        },
        plugins: [
            artplayerPluginHighlight({highlights: highlights})
        ],
        settings: [
            {
                value: "video_speed",
                html: _.lang == "tr"? "Hız" : "Speed",
                tooltip: "Normal"
            },
            {
                value: "quality",
                html: _.lang == "tr"? "Kalite" : "Quality",
                tooltip: artPlayer_qualityName(_.selected_video)
            },
            {
                value: "sound",
                html: _.lang == "tr"? "Ses" : "Audio",
                tooltip: _.sound_group.name
            },
            {
                value: "subtitle",
                html: _.lang == "tr"? "Alt Yazı Grubu" : "Subtitle Group",
                tooltip: _.subtitle_group?.name || _.lang == "tr"? "Alt yazı yok" : "No"
            },
            {
                value: "subtitle_style",
                width: 300,
                html: _.lang == "tr"? "Alt Yazı" : "Subtitle",
                tooltip: _.lang == "tr"? "Ayarları" : "Config"
            },
            {
                value: "player_settings",
                width: 350,
                html:  _.lang == "tr"? "Oynatıcı Ayarları" : "Player Settings",
                tooltip: _.lang == "tr"? "Yönet" : "Config"
            },
            {
                value: "filtre_settings",
                width: 350,
                html: _.lang == "tr"? "Video Filtre" : "Video Filter",
                tooltip: _.lang == "tr"? "Yönet" : "Config"
            }
        ],
        customType: {
            m3u8: function (video, url, art) {
                /*
                    Eski hls örneği video elementine bağlı kalırsa yeni kaynakla çakışıp
                    oynatmayı durduruyor. Dublaj/kalite geçişinde önce onu kapatıyoruz.
                */
                if(art.hls) {
                    art.hls.destroy();
                    art.hls = null;
                };

                if(Hls.isSupported()) {
                    const hls = new Hls();
                    hls.loadSource(url);
                    hls.attachMedia(video);

                    art.hls = hls;

                    if(!art.hls_destroy_hook) {
                        art.hls_destroy_hook = true;
                        art.on("destroy", () => art.hls?.destroy());
                    };
                } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
                    video.src = url;
                } else {
                    alert("Cihaz HLS desteklemiyor. Lütfen farklı bir oynatıcıda açmayı deneyiniz.");
                };
            }
        },
        controls: [
            {
                name: "next_forward_button",
                index: 18,
                position: "left",
                html: `<svg width="20" height="20"><g fill="#ffffff" transform="translate(1.700012, 0.5)"><path d="M0,10.3636364 C0,15.1333683 3.72741627,19 8.32541726,19 C12.9234182,19 16.6508345,15.1333683 16.6508345,10.3636364 C16.6508345,5.59390443 12.9234182,1.72727273 8.32541726,1.72727273 L8.32541726,3.45454545 C12.003818,3.45454545 14.9857511,6.54785082 14.9857511,10.3636364 C14.9857511,14.1794219 12.003818,17.2727273 8.32541726,17.2727273 C4.64701647,17.2727273 1.66508345,14.1794219 1.66508345,10.3636364 L0,10.3636364 Z" fill-rule="nonzero" fill="#ffffff"></path><path d="M6.29998779,12.83394 L6.29998779,14.1293945 L9.22221877,14.1293945 L9.32740298,14.1201381 C9.54131769,14.0822154 9.81021763,13.9698415 10.0736306,13.7329944 C10.4890138,13.3595039 10.7315055,12.7913745 10.7315055,12.0472634 C10.7315055,11.2576133 10.39699,10.672813 9.85682887,10.3211666 C9.54334413,10.1170871 9.23731428,10.0297859 9.00408136,10.005902 L7.58843693,10.0037278 L7.58843693,8.76076438 L10.4858691,8.76076438 L10.4858691,7.46530984 L6.33962434,7.46530984 L6.33962434,11.2982233 L8.94274004,11.2982233 C8.9392556,11.3010149 9.06986045,11.3382726 9.1930104,11.4184436 C9.38057378,11.5405479 9.48269294,11.7190726 9.48269294,12.0472634 C9.48269294,12.4209931 9.39335449,12.6303025 9.25568737,12.7540855 C9.20916034,12.7959202 9.16517083,12.8214675 9.13948722,12.83394 L6.29998779,12.83394 Z" fill-rule="nonzero" fill="#ffffff"></path><polygon points="9.82779208 0 9.82779208 5.18181818 5.84095179 2.59090909" fill="#ffffff"></polygon><polygon points="5.82779208 0 5.82779208 5.18181818 1.84095179 2.59090909" fill="#ffffff"></polygon></g></svg>`,
                tooltip: _.lang == "tr"? "Geri Sar" : "Rewind",
                style: {color: "red", display: _.is_mobile? "none" : ""},
                mounted: function($el) {
                    $el.id = "next_forward_button";
                },
                click: function (...args) {
                    player.currentTime -= parseFloat(_.player_settings.forward_backward);
                }
            },
            {
                name: "rewind_button",
                index: 19,
                position: "left",
                html: `<svg width="20" height="20"><g fill="#ffffff" transform="translate(1.700012, 0.5)"><path d="M-3.90798505e-14,10.3636364 C-3.90798505e-14,15.1333683 3.72741627,19 8.32541726,19 C12.9234182,19 16.6508345,15.1333683 16.6508345,10.3636364 C16.6508345,5.59390443 12.9234182,1.72727273 8.32541726,1.72727273 L8.32541726,3.45454545 C12.003818,3.45454545 14.9857511,6.54785082 14.9857511,10.3636364 C14.9857511,14.1794219 12.003818,17.2727273 8.32541726,17.2727273 C4.64701647,17.2727273 1.66508345,14.1794219 1.66508345,10.3636364 L-3.90798505e-14,10.3636364 Z" fill-rule="nonzero" transform="translate(8.325417, 10.363636) scale(-1, 1) translate(-8.325417, -10.363636) " fill="#ffffff"></path><path d="M6.29998779,12.83394 L6.29998779,14.1293945 L9.22221877,14.1293945 L9.32740298,14.1201381 C9.54131769,14.0822154 9.81021763,13.9698415 10.0736306,13.7329944 C10.4890138,13.3595039 10.7315055,12.7913745 10.7315055,12.0472634 C10.7315055,11.2576133 10.39699,10.672813 9.85682887,10.3211666 C9.54334413,10.1170871 9.23731428,10.0297859 9.00408136,10.005902 L7.58843693,10.0037278 L7.58843693,8.76076438 L10.4858691,8.76076438 L10.4858691,7.46530984 L6.33962434,7.46530984 L6.33962434,11.2982233 L8.94274004,11.2982233 C8.9392556,11.3010149 9.06986045,11.3382726 9.1930104,11.4184436 C9.38057378,11.5405479 9.48269294,11.7190726 9.48269294,12.0472634 C9.48269294,12.4209931 9.39335449,12.6303025 9.25568737,12.7540855 C9.20916034,12.7959202 9.16517083,12.8214675 9.13948722,12.83394 L6.29998779,12.83394 Z" fill-rule="nonzero" fill="#ffffff"></path><polygon transform="translate(8.834372, 2.590909) scale(-1, 1) translate(-8.834372, -2.590909) " points="10.8277921 0 10.8277921 5.18181818 6.84095179 2.59090909" fill="#ffffff"></polygon><polygon transform="translate(12.624860, 2.590909) scale(-1, 1) translate(-12.624860, -2.590909) " points="14.6182806 0 14.6182806 5.18181818 10.6314403 2.59090909" fill="#ffffff"></polygon></g></svg>`,
                tooltip: _.lang == "tr"? "İleri Sar" : "Fast Forward",
                style: {color: "red", display: _.is_mobile? "none" : ""},
                mounted: function($el) {
                    $el.id = "rewind_button";
                },
                click: function (...args) {
                    player.currentTime += parseFloat(_.player_settings.forward_backward);
                }
            },
            {
                name: "episode_info",
                index: 5,
                position: "right",
                html: `
                    <div id="content_name" style="${_.is_mobile? "display: none;" : ""} padding: 0 10px; font-size: 14px; color: white; opacity: 0.9; pointer-events: none;">
                        ${String(_.data.content?.name).slice(0, 20)}${_.data.content?.name?.length > 20? "..." : ""} ${_.data.content?.type == "series"? `• S${_.season} B${_.episode}` : ""}
                    </div>
                `
            }
        ]
    });

    artPlayer_playerSettingsSet();
    artPlayer_qualitySet();
    artPlayer_soundSet();
    artPlayer_speedSet();
    artPlayer_subtitleSet();
    artPlayer_subtitleStyleSet();
    artPlayer_playerVideoFiltersSet();

    artPlayer_eventReady();
    artPlayer_eventSwitchVideo();
    artPlayer_eventTimeUpdate();
    artPlayer_eventSubtitlePosition();
    artPlayer_eventPlaying();
    artPlayer_eventFullScreen();
    artPlayer_eventTouchend();
    artPlayer_eventMobileClickHandler();
    
    if(_.data.seasons?.length >= 1) {
        player.controls.add({
            name: "seasons",
            position: "right",
            html: `<svg class="art-icon-seasons" viewBox="0 0 24 24" fill="white"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>`,
            tooltip: _.lang == "tr"? "Sezon ve Bölümler" : "Episodes",
            click() {
                toggleSeasonsPanel();
            },
            mounted($control) {
                player.__seasonsBtn = $control;
                player.__seasonsBtn.style.display = (_.is_mobile && !player.fullscreen)? "none" : "flex";
            }
        });
    };
};

function itemHasOrCurrentValue(data) {
    const getValue = localStorage.getItem(data.value);
    if(getValue) return getValue == "true";

    return data.current;
};

toSec = t => t.split(":").reduce((a,b) => a*60+parseInt(b), 0);

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if(h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;

    return `${m}:${s.toString().padStart(2, "0")}`;
};

function artplayerPluginHighlight(option) {
    return (art) => {
        const {$progress} = art.template;
        
        const $highlight = document.createElement("div");
        $highlight.className = "art-highlight-container";
        $progress.appendChild($highlight);

        art.addHighlight = function(startSec, endSec, text, color = "#ffeb3b") {
            const duration = art.duration;
            if(!duration || duration === Infinity) return;
            
            const leftPercent = (startSec / duration) * 100;
            const widthPercent = ((endSec - startSec) / duration) * 100;
            
            const $range = document.createElement("div");
            $range.className = "art-highlight-range";
            $range.style.left = `${leftPercent}%`;
            $range.style.width = `${widthPercent}%`;
            $range.style.backgroundColor = color;
            $range.dataset.start = startSec;
            $range.dataset.end = endSec;
            $range.dataset.text = text;

            const $tooltip = document.createElement("div");
            $tooltip.className = "art-highlight-tooltip";
            $tooltip.innerHTML = `<div class="tooltip-title">${text}</div><div class="tooltip-time">${formatTime(startSec)} - ${formatTime(endSec)}</div>`;
            $range.appendChild($tooltip);

            $range.addEventListener("click", (e) => {
                e.stopPropagation();
                art.currentTime = startSec;
                art.play();
            });

            $highlight.appendChild($range);
            return $range;
        };

        art.clearHighlights = function() {
            $highlight.innerHTML = "";
        };

        if(option?.highlights) {
            art.on("ready", () => {
                option.highlights.forEach(h => art.addHighlight(h.start, h.end, h.text, h.color));
            });
        };

        return {name: "artplayerPluginHighlight"};
    };
};

function nextEpisodeTarget() {
    window.parent.postMessage({ID: "player", type: "episode_change", skin: "art", direct: "next_episode"}, "*");
};

function skipEnding() {
    player.currentTime = _.data.content.next_episode_end;
    _.ending_skip = true;
};

function skipOpening() {
    player.currentTime = toSec(_.data?.content?.opening?.end);
    _.opening_skip = true;
};

function artPlayer_playerSettings_fullScreen(status) {
    localStorage.setItem("art_player_playing_auto_fullscreen", status);
    _.player_settings.playing_auto_fullscreen = status;

    const setting = player.setting.option.find(s => s.value == "player_settings");
    if(!setting) return;

    const introOption = setting.selector.find(o => o.id === "playing_auto_fullscreen");
    if(!introOption) return;

    introOption.switch = status;
    introOption.tooltip = status? `${_.lang == "tr"? "Açık" : "Open"}` : `${_.lang == "tr"? "Kapalı" : "Closed"}`;

    player.setting.update(setting);
};

function artPlayer_playerSettings_introChange(status) {
    localStorage.setItem("art_player_opening_auto_skip", status);
    _.player_settings.opening_auto_skip = status;

    const setting = player.setting.option.find(s => s.value == "player_settings");
    if(!setting) return;

    const introOption = setting.selector.find(o => o.id === "intro_ending_auto_skip");
    if(!introOption) return;

    introOption.switch = status;
    introOption.tooltip = status? `${_.lang == "tr"? "Açık" : "Open"}` : `${_.lang == "tr"? "Kapalı" : "Closed"}`;

    player.setting.update(setting);
};

function artPlayer_playerSettings_nextEpisodeChange(status) {
    localStorage.setItem("art_player_next_auto_skip", status);
    _.player_settings.next_auto_skip = status;

    const setting = player.setting.option.find(s => s.value == "player_settings");
    if(!setting) return;

    const introOption = setting.selector.find(o => o.id === "next_episode_auto_skip");
    if(!introOption) return;

    introOption.switch = status;
    introOption.tooltip = status? `${_.lang == "tr"? "Açık" : "Open"}` : `${_.lang == "tr"? "Kapalı" : "Closed"}`;

    player.setting.update(setting);
};

const currentSettings = {
    forward_backward: 5,
    number_key_seek: true,
    opening_auto_skip: true,
    next_auto_skip: true,
    playing_auto_fullscreen: true
};

function artPlayer_playerSettingsRead(datas) {
    _.player_settings = {
        forward_backward: localStorage.getItem("art_player_forward_backward") || currentSettings.forward_backward,
        number_key_seek: itemHasOrCurrentValue({type: "boolean", value: "art_player_number_key_seek", current: currentSettings.number_key_seek}),
        opening_auto_skip: itemHasOrCurrentValue({type: "boolean", value: "art_player_opening_auto_skip", current: currentSettings.opening_auto_skip}),
        next_auto_skip: itemHasOrCurrentValue({type: "boolean", value: "art_player_next_auto_skip", current: currentSettings.next_auto_skip}),
        playing_auto_fullscreen: itemHasOrCurrentValue({type: "boolean", value: "art_player_playing_auto_fullscreen", current: currentSettings.playing_auto_fullscreen})
    };

    if(datas?.current_style) {
        _.player_settings = currentSettings;

        ["art_player_forward_backward", "art_player_number_key_seek", "art_player_opening_auto_skip", "art_player_next_auto_skip"]
            .forEach(key => localStorage.removeItem(key));
    };

    return true;
};

function artPlayer_playerSettingsSet() {
    artPlayer_playerSettingsRead();

    const options = [
       {
            html: _.lang == "tr"? "İleri-Geri Aralığı" : "Forward-Backward Interval",
            tooltip: _.player_settings.forward_backward + `${_.lang == "tr"? "sn" : "s"}`,
            range: [
                _.player_settings.forward_backward,
                5, // Minimum
                60, // Maximum
                5 // Adım
            ],
            onChange(item) {
                const value = item.range[0];

                localStorage.setItem("art_player_forward_backward", value);
                artPlayer_playerSettingsRead();

                return value + `${_.lang == "tr"? "sn" : "s"}`;
            }
        },
        {
            html: _.lang == "tr"? "Sayılar ile Zaman Atlama" : "Numbers and Time Jump",
            tooltip: _.player_settings.number_key_seek? `${_.lang == "tr"? "Açık" : "Open"}` : `${_.lang == "tr"? "Kapalı" : "Closed"}`,
            switch: _.player_settings.number_key_seek,
            onSwitch(item) {
                const value = !item.switch;
                localStorage.setItem("art_player_number_key_seek", value);
                artPlayer_playerSettingsRead();

                item.tooltip = value? `${_.lang == "tr"? "Açık" : "Open"}` : `${_.lang == "tr"? "Kapalı" : "Closed"}`;
                return value;
            }
        },
        {
            id: "intro_ending_auto_skip",
            html: _.lang == "tr"? "İntro & Ending Otomatik Atla" : "Intro and Ending Auto Skip",
            tooltip: _.player_settings.opening_auto_skip? `${_.lang == "tr"? "Açık" : "Open"}` : `${_.lang == "tr"? "Kapalı" : "Closed"}`,
            switch: _.player_settings.opening_auto_skip,
            onSwitch(item) {
                const value = !item.switch;
                localStorage.setItem("art_player_opening_auto_skip", value);
                artPlayer_playerSettingsRead();
                artPlayer_playerSettingsTrigger();

                item.tooltip = value? `${_.lang == "tr"? "Açık" : "Open"}` : `${_.lang == "tr"? "Kapalı" : "Closed"}`;
                return value;
            }
        },
        {
            id: "next_episode_auto_skip",
            html: _.lang == "tr"? "Sonraki Bölüme Otomatik Geç" : "Auto Next Episode",
            tooltip: _.player_settings.next_auto_skip? `${_.lang == "tr"? "Açık" : "Open"}` : `${_.lang == "tr"? "Kapalı" : "Closed"}`,
            switch: _.player_settings.next_auto_skip,
            onSwitch(item) {
                const value = !item.switch;
                localStorage.setItem("art_player_next_auto_skip", value);
                artPlayer_playerSettingsRead();
                artPlayer_playerSettingsTrigger();
                
                item.tooltip = value? `${_.lang == "tr"? "Açık" : "Open"}` : `${_.lang == "tr"? "Kapalı" : "Closed"}`;
                return value;
            }
        },
        {
            id: "playing_auto_fullscreen",
            html: _.lang == "tr"? "Otomatik Tam Ekran" : "Auto Fullscreen",
            tooltip: _.player_settings.playing_auto_fullscreen? `${_.lang == "tr"? "Açık" : "Open"}` : `${_.lang == "tr"? "Kapalı" : "Closed"}`,
            switch: _.player_settings.playing_auto_fullscreen,
            onSwitch(item) {
                const value = !item.switch;
                localStorage.setItem("art_player_playing_auto_fullscreen", value);
                artPlayer_playerSettingsRead();
                artPlayer_playerSettingsTrigger();

                item.tooltip = value? `${_.lang == "tr"? "Açık" : "Open"}` : `${_.lang == "tr"? "Kapalı" : "Closed"}`;
                return value;
            }
        }
    ];

    const setting = player.setting.option.find(s => s.value == "player_settings");
    if(!setting) return;

    setting.selector = options;
    setting.icon = player.icons.config;

    player.setting.update(setting);
    artPlayer_playerSettingsTrigger();
};

function artPlayer_playerSettingsTrigger() {
    window.parent.postMessage({
        ID: "player",
        type: "player_settings",
        data: {
            opening_auto_skip: _.player_settings.opening_auto_skip,
            next_auto_skip: _.player_settings.next_auto_skip,
            playing_auto_fullscreen: _.player_settings.playing_auto_fullscreen
        }
    }, "*");
};

function toggleSeasonsPanel() {
    _.seasons_panel? hideSeasonsPanel() : showSeasonsPanel();
};

function hideSeasonsPanel() {
    _.seasons_panel = false;
    player.layers.remove("seasons-panel");
};

async function showSeasonsPanel() {
    _.seasons_panel = true;
    let html = `<div class="seasons-panel"><h3 style="margin-top: 0; border-bottom: 2px solid red; padding-bottom: 10px;">${_.lang == "tr"? "Sezon ve Bölümler" : "Episodes"}</h3>`;

    _.data.seasons.forEach(season => {
        const isOpen = _.open_season === season.number;

        html += `
            <div class="season-item" season="${season.number}">
                <span>${season.number}. ${_.lang == "tr"? "Sezon" : "Season"}</span>
                <span class="season-arrow ${isOpen? "open" : ""}">▶</span>
            </div>

            <div class="episode-list" season="${season.number}" style="${isOpen? "" : "display: none;"}">
                ${(season.episodes || []).map(episode => {
                    const isActive = (season.number === _.season && episode.number === _.episode)? "active" : "";

                    return `
                    <div class="episode-item ${isActive}" episode="${episode.number}" season="${season.number}">
                        ${episode.number}. ${_.lang == "tr"? "Bölüm" : "Episode"}
                    </div>`;
                }).join("")}
            </div>
        `;
    });
    
    html += `</div>`;

    player.layers.add({
        name: "seasons-panel",
        html: html,
        style: {
            position: "absolute",
            top: "0",
            right: "0",
            width: "350px",
            height: "100%",
            background: "rgba(0, 0, 0, 0.95)",
            zIndex: 20
        }
    });

    attachSeasonEventListeners();
    await new Promise(r => setTimeout(r, 50));

    // aktif olan bölüme scroll ile kaydır
    const active = document.querySelector(".episode-item.active");
    if(!active) return;

    const list = active.closest(".episode-list");
    if(!list) return;

    list.scrollTop = active.offsetTop - list.clientHeight / 2 + active.clientHeight / 2;
};

function attachSeasonEventListeners() {
    const panel = document.querySelector(".seasons-panel");

    panel.querySelectorAll(".season-item").forEach(item => {
        item.addEventListener("click", function(e) {
            e.stopPropagation();

            const seasonNumber = parseFloat($(this).attr("season"));
            _.open_season = seasonNumber;

            const episodesElement = $(`.episode-list[season="${seasonNumber}"]`);
            const visible = episodesElement.is(":visible");

            $("div.episode-list").hide();

            if(visible) episodesElement.hide();
            else episodesElement.show();
        });
    });

    panel.querySelectorAll(".episode-item").forEach(item => {
        item.addEventListener("click", function(e) {
            e.stopPropagation();

            const seasonNumber = parseFloat($(this).attr("season"));
            const episodeNumber = parseFloat($(this).attr("episode"));
            
            window.parent.postMessage({ID: "player", type: "episode_change", skin: "art", season: seasonNumber, episode: episodeNumber}, "*");
        });
    });

    setTimeout(() => {
        document.addEventListener("click", closePanelOnOutsideClick);
    }, 100);
};

function closePanelOnOutsideClick(e) {
    const panel = document.querySelector(".seasons-panel");
    const seasonsButton = document.querySelector(".art-control-seasons");
    
    if(panel && !panel.contains(e.target) && (!seasonsButton || !seasonsButton.contains(e.target))) {
        hideSeasonsPanel();
    };
};

function updateSubtitleStyle(property, value) {
    const subtitleElements = document.querySelectorAll(".artplayer-subtitle, .art-subtitle");
    
    subtitleElements.forEach(element => element.style[property] = value);
    if(!player.subtitle) return;

    player.subtitle.style = player.subtitle.style || {};
    player.subtitle.style[property] = value;
};

function artPlayer_subtitleSet() {
    const options = [
        {
            html: `${_.lang == "tr"? "Görünüm" : "Display"}`,
            tooltip: _.subtitle_closed? `${_.lang == "tr"? "Kapalı" : "Off"}` : `${_.lang == "tr"? "Açık" : "On"}`,
            switch: !_.subtitle_closed,
            async onSwitch(item) {
                localStorage.setItem("art_subtitle_show", !item.switch);
                _.subtitle_closed = item.switch;

                item.tooltip = item.switch? `${_.lang == "tr"? "Kapalı" : "Off"}` : `${_.lang == "tr"? "Açık" : "On"}`;
                artPlayer_subtitleDisplay();

                return !item.switch;
            }
        },
        ...(
            (_.data.subtitles || []).map(x => ({
                default: _.subtitle_group?.group == x.group,
                html: x.name,
                link: x.link,
                group: x.group
            }))
        )
    ];

    const setting = player.setting.option.find(s => s.value == "subtitle");
    if(!setting) return;

    setting.tooltip = _.subtitle_group?.name || `${_.lang == "tr"? "Alt Yazı Yok" : "No"}`;
    setting.selector = options;
    setting.icon = player.icons.config;

    setting.onSelect = async (item) => {
        localStorage.setItem("art_subtitle", item.group);
        await artPlayer_dataSet();

        artPlayer_subtitleSwitch({link: item.link, name: item.html});
        return item.html;
    };

    player.setting.update(setting);

    if(_.subtitle_group) artPlayer_subtitleSwitch({link: _.subtitle_group.link, name: _.subtitle_group.name});
};

function artPlayer_subtitleDisplay() {
    player.subtitle.show = !_.subtitle_closed;
};

async function artPlayer_subtitleSwitch(item) {
    item.link += "&type=json";

    const response = await $.ajax({url: item.link,  method: "GET", xhrFields: {responseType: "blob"}}).catch(err => {});
    if(!response) return console.log("altyazı dosyasına istek atamadım.");
    
    try {
        _.subtitle_data = JSON.parse(await response.text());
    } catch (error) {
        console.error(error);
        return console.log("Altyazıyı parse edemedim.");
    };

    const vttFormat = "WEBVTT\n\n" + _.subtitle_data.map(sub => {
        return `${sub.start} --> ${sub.end}\n<line r="${sub.row}" style="${_.subtitle_style.background? `background-color: rgba(0, 0, 0, 0.667); padding: 10px; border-radius: 10px;` : ""}">${sub.text}</line>\n`;
    }).join("\n");

    const vttBlob = new Blob([vttFormat], {type: "text/vtt"});
    const blobUrl = URL.createObjectURL(vttBlob);
        
    player.subtitle.switch(blobUrl, {name: item.name});
};

let currentStyle = {
    font_size: "40px",
    font_color: "#fff",
    font_family: "Verdana",
    background: false,
    text_shadow: true,
    text_bold: false,
    text_ground_clearance: "20px",
    position: "bottom"
};

function artPlayer_subtitleStyleRead(datas) {
    if(_.is_mobile) { // eğer cihaz mobil ise
        currentStyle.font_size = "20px";
    };

    _.subtitle_style = {
        font_size: localStorage.getItem("art_subtitle_font_size") || currentStyle.font_size,
        font_color: localStorage.getItem("art_subtitle_font_color") || currentStyle.font_color,
        font_family: localStorage.getItem("art_subtitle_font_family") || currentStyle.font_family,
        background: itemHasOrCurrentValue({type: "boolean", value: "art_subtitle_background", current: currentStyle.background}),
        text_shadow: itemHasOrCurrentValue({type: "boolean", value: "art_subtitle_text_shadow", current: currentStyle.text_shadow}),
        text_bold: itemHasOrCurrentValue({type: "boolean", value: "art_subtitle_text_bold", current: currentStyle.text_bold}),
        text_ground_clearance: localStorage.getItem("art_subtitle_text_ground_clearance") || currentStyle.text_ground_clearance,
        position: localStorage.getItem("art_subtitle_position") || currentStyle.position
    };

    //if(_.id == "3138199710558108") _.subtitle_style.background = true; // demon slayer filminie özel siyah arka plan açık gelsin.

    if(datas?.current_style) {
        _.subtitle_style = currentStyle;

        [
            "art_subtitle_font_size", "art_subtitle_font_color", "art_subtitle_font_family", "art_subtitle_background",
            "art_subtitle_text_shadow", "art_subtitle_text_bold", "art_subtitle_text_ground_clearance", "art_subtitle_position", "art_subtitle_background"
        ].forEach(key => localStorage.removeItem(key));
    };

    _.subtitle_font_color = _.subtitle_colors.find(x => x.hex == _.subtitle_style.font_color) || _.subtitle_colors[0];
    _.subtitle_font_family = _.subtitle_fonts.find(x => x.name == _.subtitle_style.font_family) || _.subtitle_fonts[0];

    updateSubtitleStyle("font-size", _.subtitle_style.font_size);
    updateSubtitleStyle("color", _.subtitle_style.font_color);
    updateSubtitleStyle("font-family", _.subtitle_style.font_family);
    updateSubtitleStyle("font-weight", _.subtitle_style.text_bold? "bold" : "normal");
    updateSubtitleStyle("padding", _.subtitle_style.text_ground_clearance);
    updateSubtitleStyle("letterSpacing", "0.5px");

    if((datas?.background_update || datas?.first) && _.subtitle_group) {
        artPlayer_subtitleSwitch({link: _.subtitle_group.link, name: _.subtitle_group.name});

        try {
            clearInterval(_.bg_loop);
        } catch (error) {};

        _.bg_loop = setInterval(() => {
            if(_.subtitle_style.background) {
                const subtitleElements = document.querySelectorAll(".art-subtitle-line");
                
                subtitleElements.forEach(element => {
                    if(element.getHTML().includes("<line")) return;

                    element.style["background-color"] = "rgba(0, 0, 0, 0.667)";
                    element.style["padding"] = "10px";
                    element.style["border-radius"] = "10px";
                });
            } else {
                clearInterval(_.bg_loop);
            };
        }, 50);
    };

    if(_.subtitle_style.text_shadow) {
        if(_.is_mobile) {
            updateSubtitleStyle("text-shadow", `
                0 0 2px #000,
                0 0 4px #1d1616ff,
                0 0 6px #000,
                0 0 10px rgba(0,0,0,0.8)
            `);
        } else {
            updateSubtitleStyle("text-shadow", `
                -3px -3px 0 #000,
                3px -3px 0 #000,
                -3px 3px 0 #000,
                3px 3px 0 #000,
                -3px 0 0 #000,
                3px 0 0 #000,
                0 -3px 0 #000,
                0 3px 0 #000,
                -2px -2px 0 #000,
                2px -2px 0 #000,
                -2px 2px 0 #000,
                2px 2px 0 #000,
                0 0 10px rgba(0,0,0,0.9),
                0 0 20px rgba(0,0,0,0.8)
            `);
        };
    } else {
        updateSubtitleStyle("text-shadow", "none");
    };

    subtitlePositionSet(_.subtitle_style.position);

    return true;
};

function subtitlePositionSet(value) {
    if(value == "top") {
        updateSubtitleStyle("top", "0%");
        updateSubtitleStyle("bottom", "auto");
    } else {
        updateSubtitleStyle("top", "");
        updateSubtitleStyle("bottom", "");
    };
};

function artPlayer_subtitleStyleSet(datas) {
    artPlayer_subtitleStyleRead({first: true});

    const options = [
       {
            html: _.lang == "tr"? "Yazı Boyutu" : "Font Size",
            tooltip: _.subtitle_style.font_size,
            range: [
                parseFloat((_.subtitle_style.font_size).replace("px", "")),
                10, // Minimum
                100, // Maximum
                10 // Adım
            ],
            onChange(item) {
                const value = item.range[0] + "px";

                localStorage.setItem("art_subtitle_font_size", value);
                artPlayer_subtitleStyleRead();

                return value;
            }
        },
        {
            html: _.lang == "tr"? "Kenar Boşluğu" : "Margin",
            tooltip: _.subtitle_style.text_ground_clearance,
            range: [
                parseFloat((_.subtitle_style.text_ground_clearance).replace("px", "")),
                10, // Minimum
                100, // Maximum
                10 // Adım
            ],
            onChange(item) {
                const value = item.range[0] + "px";

                localStorage.setItem("art_subtitle_text_ground_clearance", value);
                artPlayer_subtitleStyleRead();

                return value;
            }
        },
        {
            html: _.lang == "tr"? "Yazı Rengi" : "Font Color",
            tooltip: _.subtitle_font_color.name,
            selector: _.subtitle_colors.map(x => ({default: x.hex == _.subtitle_font_color.hex, html: x.name, value: x.hex})),
            onSelect(item) {
                localStorage.setItem("art_subtitle_font_color", item.value);
                artPlayer_subtitleStyleRead();

                return item.html;
            }
        },
        {
            html: _.lang == "tr"? "Arka Plan" : "Background",
            tooltip: _.subtitle_style.background? `${_.lang == "tr"? "Açık" : "Open"}` : `${_.lang == "tr"? "Kapalı" : "Closed"}`,
            switch: _.subtitle_style.background,
            onSwitch(item) {
                const value = !item.switch;

                localStorage.setItem("art_subtitle_background", value);
                artPlayer_subtitleStyleRead({background_update: true});

                item.tooltip = value? `${_.lang == "tr"? "Açık" : "Open"}` : `${_.lang == "tr"? "Kapalı" : "Closed"}`;
                return value;
            }
        },
        {
            html: _.lang == "tr"? "Yazı Tipi" : "Font Family",
            tooltip: _.subtitle_font_family.name,
            selector: _.subtitle_fonts.map(x => ({default: x.name == _.subtitle_font_family.name, html: x.name, value: x.name})),
            onSelect(item) {
                localStorage.setItem("art_subtitle_font_family", item.value);
                artPlayer_subtitleStyleRead();

                return item.html;
            }
        },
        {
            html: _.lang == "tr"? "Metin Gölgesi" : "Text Shadow",
            tooltip: _.subtitle_style.text_shadow? `${_.lang == "tr"? "Açık" : "Open"}` : `${_.lang == "tr"? "Kapalı" : "Closed"}`,
            switch: _.subtitle_style.text_shadow,
            onSwitch(item) {
                const value = !item.switch;
                localStorage.setItem("art_subtitle_text_shadow", value);
                artPlayer_subtitleStyleRead();

                item.tooltip = value? `${_.lang == "tr"? "Açık" : "Open"}` : `${_.lang == "tr"? "Kapalı" : "Closed"}`;
                return value;
            }
        },
        {
            html: _.lang == "tr"? "Kalın Metin" : "Text Bold",
            tooltip: _.subtitle_style.text_bold? `${_.lang == "tr"? "Açık" : "Open"}` : `${_.lang == "tr"? "Kapalı" : "Closed"}`,
            switch: _.subtitle_style.text_bold,
            onSwitch(item) {
                const value = !item.switch;
                localStorage.setItem("art_subtitle_text_bold", value);
                artPlayer_subtitleStyleRead();

                item.tooltip = value? `${_.lang == "tr"? "Açık" : "Open"}` : `${_.lang == "tr"? "Kapalı" : "Closed"}`;
                return value;
            }
        },
        /*{ // bunu kapatma sebebim an8 olanlar altyazı üste gelince üst üstte bunlar çakışıyor :)
            html: "Konum",
            tooltip: _.subtitle_style.position == "bottom"? "Alt" : "Üst",
            selector: [
                {
                    default: _.subtitle_style.position == "bottom",
                    html: "Alt",
                    value: "bottom"
                },
                {
                    default: _.subtitle_style.position == "top",
                    html: "Üst",
                    value: "top"
                }
            ],
            onSelect(item) {                
                localStorage.setItem("art_subtitle_position", item.value);
                artPlayer_subtitleStyleRead();

                return item.html;
            }
        },*/
        {
            html: _.lang == "tr"? "Ayarları Sıfırla" : "Config Reset",
            onClick() {
                artPlayer_subtitleStyleRead({current_style: true});
                artPlayer_subtitleStyleSet();
                
                return _.lang == "tr"? "Sıfırlandı" : "Reset";
            }
        }
    ];

    const setting = player.setting.option.find(s => s.value == "subtitle_style");
    if(!setting) return;

    setting.selector = options;
    setting.icon = player.icons.config;

    player.setting.update(setting);
};

function artPlayer_qualityName(item) {
    return `${item.quality}p ${item.quality === 2160 ? "(4K)" : item.quality === 1440 ? "(2K)" : ""}`;
};

function artPlayer_qualitySet() {
    const options = _.sound_group.items.sort((a, b) => b.quality - a.quality).map(x => ({
        default: _.selected_video.quality === x.quality,
        html: artPlayer_qualityName(x),
        link: x.link,
        quality: x.quality
    }));

    const setting = player.setting.option.find(s => s.value == "quality");
    if(!setting) return;

    setting.tooltip = artPlayer_qualityName(_.selected_video);
    setting.selector = options;
    setting.icon = player.icons.config;

    setting.onSelect = async (item) => {
        localStorage.setItem("art_quality", item.quality);
        await artPlayer_dataSet();

        await artPlayer_switchVideo({link: item.link});
        return item.html;
    };

    player.setting.update(setting);
};

function artPlayer_soundSet() {
    const options = _.data.groups.map(x => ({default: _.sound_group.group == x.group, html: x.name, group: x.group}));

    const setting = player.setting.option.find(s => s.value == "sound");
    if(!setting) return;

    setting.tooltip = _.sound_group.name;
    setting.selector = options;
    setting.icon = player.icons.config;

    setting.onSelect = async (item) => {
        localStorage.setItem("art_sound", item.group);
        await artPlayer_dataSet();

        await artPlayer_switchVideo({link: _.selected_video.link});
        artPlayer_qualitySet();
        
        return item.html;
    };

    player.setting.update(setting);
};

const speeds = [
    {value: 0.5, name: "0.5"},
    {value: 0.75, name: "0.75"},
    {value: 1.0, name: "1"},
    {value: 1.25, name: "1.25"},
    {value: 1.5, name: "1.5"},
    {value: 2.0, name: "2"},
    {value: 3.0, name: "3"},
    {value: 4.0, name: "4"},
];

function artPlayer_speedSet() {
    const options = speeds.map(x => ({default: _.video_speed === x.value, html: x.name == "1"? "Normal" : x.name, value: x.value}));

    const setting = player.setting.option.find(s => s.value == "video_speed");
    if(!setting) return;

    setting.tooltip = _.video_speed === 1.0? "Normal" : _.video_speed;
    setting.selector = options;
    setting.icon = player.icons.config;

    setting.onSelect = async (item) => {
        localStorage.setItem("art_video_speed", item.value);
        player.playbackRate = parseFloat(item.value);

        return item.html;
    };

    player.setting.update(setting);
};

async function artPlayer_switchVideo(datas) {
    const currentTime = player.currentTime;
    const currentSubtitle = _.subtitle_group;

    await player.switchUrl(datas.link);

    player.currentTime = currentTime;

    if (currentSubtitle?.link) {
        artPlayer_subtitleSwitch({
            link: currentSubtitle.link,
            name: currentSubtitle.name,
        });
    };

    await player.play().catch(() => {});

    return true;
};

async function artPlayer_playerVideoFiltersRead(datas) {
    _.video_filter = localStorage.getItem("art_player_video_filter");
    _.video_filter_group = localStorage.getItem("art_player_video_filter_group");

    if(_.video_filter && _.video_filter_group) {
        const filterFind = await videoFilters.find(group => group.id == _.video_filter_group)?.items?.find(item => item.id == _.video_filter);

        if(filterFind) {
            player.video.style.filter = filterFind.filtre;
            return;
        };
    };

    player.video.style.filter = "";
};

const videoFilters = [
    {
        id: "cinematic",
        name: "Cinematic",
        items: [
            {
                id: "hollywood",
                name: "Hollywood",
                filtre: "contrast(130%) saturate(120%) sepia(10%) hue-rotate(2deg) sepia(0.07) hue-rotate(-7deg)"
            },
            {
                id: "film_noir",
                name: "Film Noir",
                filtre: "contrast(100%) saturate(100%) sepia(0%) hue-rotate(0deg) blur(0px)"
            },
            {
                id: "blockbuster",
                name: "Blockbuster",
                filtre: "contrast(130%) saturate(150%) sepia(0%) hue-rotate(-2deg) sepia(0.1) hue-rotate(-10deg)"
            }
        ]
    },
    {
        id: "vintage",
        name: "Vintage",
        items: [
            {
                id: "old_film",
                name: "Old Film",
                filtre: "contrast(100%) saturate(100%) sepia(0%) hue-rotate(0deg) blur(0px)"
            },
            {
                id: "vhs",
                name: "vhs",
                filtre: "contrast(90%) saturate(140%) sepia(10%) hue-rotate(8deg) sepia(0.08) hue-rotate(-8deg)"
            }
        ]
    },
    {
        id: "mood",
        name: "Mood",
        items: [
            {
                id: "romance",
                name: "Romance",
                filtre: "contrast(100%) saturate(130%) sepia(10%) hue-rotate(5deg) sepia(0.14) hue-rotate(-14deg)"
            }
        ]
    },
    {
        id: "style",
        name: "Style",
        items: [
            {
                id: "anime",
                name: "Anime",
                filtre: "contrast(135%) saturate(165%) sepia(0%) hue-rotate(2deg) sepia(0.1) hue-rotate(-10deg)"
            },
            {
                id: "comic",
                name: "Comic",
                filtre: "contrast(150%) saturate(175%) sepia(0%) hue-rotate(0deg) sepia(0.06) hue-rotate(-6deg)"
            },
            {
                id: "cartoon",
                name: "Cartoon",
                filtre: "contrast(160%) saturate(185%) sepia(0%) hue-rotate(0deg) sepia(0.1) hue-rotate(-10deg)"
            }
        ]
    },
    {
        id: "color",
        name: "Color",
        items: [
            {
                id: "warm",
                name: "Warm",
                filtre: "contrast(115%) saturate(125%) sepia(10%) hue-rotate(0deg) sepia(0.2) hue-rotate(-20deg)"
            },
            {
                id: "high_contrast",
                name: "High Contrast",
                filtre: "contrast(180%) saturate(130%) sepia(0%) hue-rotate(0deg)"
            }
        ]
    }
];

function artPlayer_playerVideoFiltersSet() {
    artPlayer_playerVideoFiltersRead();

    const options = [
        ...videoFilters.map(group => ({
            html: group.name,
            tooltip: _.video_filter_group == group.id? _.lang == "tr"? "Aktif" : "Active" : _.lang == "tr"? "Yönet" : "Config",
            selector: group.items.map(item => ({default: _.video_filter == item.id, html: item.name, value: item.id, group: group.id})),
            onSelect(item) {
                localStorage.setItem("art_player_video_filter", item.value);
                localStorage.setItem("art_player_video_filter_group", item.group);
                artPlayer_playerVideoFiltersRead();

                return item.html;
            }
        })),
        {
            html: "Filteyi Kapat",
            onClick() {
                localStorage.removeItem("art_player_video_filter");
                localStorage.removeItem("art_player_video_filter_group");
                artPlayer_playerVideoFiltersRead();

                return "Sıfırlandı";
            }
        }
    ];

    const setting = player.setting.option.find(s => s.value == "filtre_settings");
    if(!setting) return;

    setting.selector = options;
    setting.icon = player.icons.config;

    player.setting.update(setting);
};

async function betaPlayer() {
    const url = new URL(window.location);

    url.searchParams.set("server", _.server);
    window.history.pushState({}, "", url);

    $("body").html(`<div id="root" style="width: 100%; height: 100%; border: none; position: inherit;"></div>`);

    $("head").append(`<link rel="stylesheet" href="/assets/skin/beta.css?v=${_.VERSION || new Date().getTime().toString()}">`);
    $("head").append(`<script src="/assets/skin/beta.js?v=${_.VERSION || new Date().getTime().toString()}" type="module"></script>`);
};

player = undefined;
download_groups = [];

setError = (text) => {
    const box = $("#box");

    if(_.hidden) box.html(`<span class="sign__text" style="margin-top: 0;" id="info_text"></span>`);
    return $("#info_text").html(text || "not-found");
};

async function run_embed() {
    $("#box").append(`<div class="sign__logo"><img src="/assets/index/img/embed-logo.png"></div>`).append(`
    <span class="sign__text" style="margin-top: 0;" id="info_text">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" width="200" height="200" style="shape-rendering: auto;" xmlns:xlink="http://www.w3.org/1999/xlink"><g><path style="transform:scale(0.8);transform-origin:50px 50px" stroke-linecap="round" d="M24.3 30C11.4 30 5 43.3 5 50s6.4 20 19.3 20c19.3 0 32.1-40 51.4-40 C88.6 30 95 43.3 95 50s-6.4 20-19.3 20C56.4 70 43.6 30 24.3 30z" stroke-dasharray="42.76482137044271 42.76482137044271" stroke-width="8" stroke="#4758a9" fill="none"><animate values="0;256.58892822265625" keyTimes="0;1" dur="1s" repeatCount="indefinite" attributeName="stroke-dashoffset"></animate></path><g></g></g></svg>
    </span>`);

    if(!_.TOKEN) return setError("Token bulunamadı.");
    if(!_.API_HOST) return setError("Api domaini bulunamadı.");

    const url = new URLSearchParams(location.search);

    const id = url.get("id");
    const season = url.get("season");
    const episode = url.get("episode");
    const plan = url.get("plan");
    const admin = url.get("admin");
    _.lang = url.get("lang") == "en"? "en" : "tr";

    const set_time = url.get("set_time");
    const skin = url.get("skin") || "playerjs";

    _.id = id;
    _.server = url.get("server") || "1";
    _.skin = skin;
    _.season = parseFloat(season);
    _.episode = parseFloat(episode);
    _.user = url.get("u");
    _.site = url.get("site") || "main";
    _.test = url.get("test") == "true"? true : false;

    if(!id) return setError("Id bulunamadı.");
    if(!plan) return setError("Plan bulunamadı.");

    if(skin == "beta") return betaPlayer();

    let fetch = await $.ajax({url: `${_.site == "world"? "https://api.anizium.de" : _.API_HOST}/anime/source?id=${id}&site=${_.site}&plan=${plan}${admin? "&admin=true" : ""}${season? `&season=${season}&episode=${episode}` : ""}&server=${_.server}`, method: "GET", headers: {"Cf-Control": _.TOKEN, "language": _.lang, "user": _.user}}).catch(err => {});
    if(!fetch || !fetch.success) return setError(fetch?.msg || "Api isteğinde bir sorun oluştu.");

    if((fetch.groups || []).length < 1) return setError("Oynatabilecek bir kaynak bulamadım.");

    if(set_time?.length >= 2) _.set_time = set_time;

    if(skin == "art") return artPlayer(fetch);
    else playerjs(fetch);
};

async function scriptLinkAdder(link) {
    await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = link;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
    });

    return true;
};

async function playerjs(data) {
    $("head").append(`<script src="/assets/skin/playerjs.js?v=${_.VERSION || new Date().getTime().toString()}"></script>`);
    $("body").html(`<div id="player" style="width: 100%; height: 100%; border: none; position: inherit;"></div>`);

    let setLinks = "";
    download_groups = data.groups;

    if(data.groups.length === 1) setLinks = data.groups[0].items.sort((a, b) => a.quality - b.quality).map(item => `[${item.quality === 2160? `2160p (4K)` : item.quality === 1440? `1440P (2K)` : `${item.quality}p`}]${item.link}`).join(",");
    else {
        const sameQualities = data.groups.reduce((acc, {items}) => acc.filter(q => items.some(({quality}) => quality === q)), data.groups[0].items.map(({quality}) => quality));
        if(sameQualities.length < 1) return setError("Gruplarda aynı kalitede kaynak bulunamadı.");

        const groupLinks = sameQualities.map(quality => {
            const qualityLinks = data.groups.flatMap(group => group.items.filter(link => link.quality === quality).map(link => ({...link, name: group.name})));
            const groupName = qualityLinks[0]?.name;
            const links = qualityLinks.map(link => `${link.name === groupName ? "" : `{${link.name}}`}${link.link}`).join(";");

            return `[${quality === 2160 ? `2160p (4K)` : quality === 1440 ? `1440P (2K)` : `${quality}p`}]${groupName ? `{${groupName}}` : ""}${links}`;
        });

        setLinks = groupLinks.join(",");
    };
    
    player = new Playerjs({
        id: "player",
        file: setLinks,
        poster: "/assets/index/img/bg-anime.png",
        hls: data.type == "hls",
        subtitle: data.subtitles?.length >= 1? data.subtitles.map(item => {
            const link = item.link.includes("?")? `${item.link}&v=${Math.floor(10000 + Math.random() * 90000)}` : `${item.link}?v=${Math.floor(10000 + Math.random() * 90000)}`;

            return `[${item.name || "Bilinmeyen"}]${link}`;
        }).join(",") : undefined,
        default_quality: "1080p",
        default_subtitle: "Türkçe"
    });

    playerjsReady();
};

async function playerjsReady() {
    const setTime = setInterval(() => {
        try {
            if(!_.set_time) return;
            
            if(player?.api("time")) {
                player.api("seek", parseFloat(_.set_time));
                _.set_time = undefined;
            };
        } catch (error) {};
    }, 100);

    setInterval(() => {
        try {
            const getTime = player.api("time");
            if(!getTime || isNaN(getTime)) return;
            window.parent.postMessage({ID: "player", type: "current_time", time: getTime}, "*");
        } catch (error) {};
    }, 1 * 60 * 1000);

    $(document).on("mousedown", async function(e) {
        if(e.ctrlKey && e.button === 0) {
            await new Promise(r => setTimeout(r, 500));
            window.parent.postMessage({ID: "player", type: "line_go", time: player.api("time")}, "*");
        };
    });
};

window.addEventListener("message", async function(event) {
    if(!event || !event.data || _.skin !== "playerjs") return;

    if(event.data.ID == "player_panel" && event.data.type == "set_time" && event.data.time) _.set_time = event.data.time;
    else if(event.data.ID == "player_panel" && event.data.type == "set_subtitle" && event.data.link) player.api("+subtitle",`[democuk]${event.data.link}`);
    else if(event.data.ID == "player_panel" && event.data.type == "trigger_download_groups") window.parent.postMessage({ID: "player", type: "trigger_download_groups", groups: download_groups}, "*");
    else if(event.data.ID == "player_panel" && event.data.type == "get_time") window.parent.postMessage({ID: "player", type: "get_time", data_type: event.data.data_type, time: player.api("time")}, "*");
});

$(document).on("submit", "#loginForm", async function(event) {
    event.preventDefault();

    const nick = getValue("#nick");
    const password = getValue("#password");

    if(!textCheck({text: nick, min: 1, max: 200})) return alert("kullanıcı adınızı giriniz.");
    if(!textCheck({text: password, min: 1, max: 200})) return alert("şifrenizi giriniz.");

    const submitButton = $(`[class-id="ModalSubmitButton"]`);
    submitButton.html("Yükleniyor").prop("disabled", true);

    const request = await $.ajax({url: "/api/user/login", type: "POST", contentType: "application/json", data: JSON.stringify({nick, password})}).catch(() => {});
    submitButton.html("Devam Et").prop("disabled", false);
    
    if(!request || request.isError) return alert(request?.msg || "Bir sorunla karşılaştık. Daha sonra tekrar dene.");
    window.location.href = "/admin";
});

(async function() {
    await datasDecrypt();
    runFunction();
})();

async function datasDecrypt() {
    clientKey = $("[rel='icon']").attr("e");
    if(!textCheck({text: clientKey, min: 1})) return alert("client-key bulunamadı.");
    
    try {
        _ = JSON.parse(decrypt(_, clientKey));
    } catch (error) {
        console.error(error);
        return alert("client-datas çözülürken bir sorun oluştu.");    
    };

    return true;
};

async function runFunction() {
    try {
        if(_?.RUN_FUNCTION && typeof window[_.RUN_FUNCTION] === "function") return window[_.RUN_FUNCTION]();
    } catch (error) {
        console.error(error);  
    };
};