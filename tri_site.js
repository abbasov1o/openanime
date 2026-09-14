var _____WB$wombat$assign$function_____=function(name){return (globalThis._wb_wombat && globalThis._wb_wombat.local_init && globalThis._wb_wombat.local_init(name))||globalThis[name];};if(!globalThis.__WB_pmw){globalThis.__WB_pmw=function(obj){this.__WB_source=obj;return this;}}{
let window = _____WB$wombat$assign$function_____("window");
let self = _____WB$wombat$assign$function_____("self");
let document = _____WB$wombat$assign$function_____("document");
let location = _____WB$wombat$assign$function_____("location");
let top = _____WB$wombat$assign$function_____("top");
let parent = _____WB$wombat$assign$function_____("parent");
let frames = _____WB$wombat$assign$function_____("frames");
let opener = _____WB$wombat$assign$function_____("opener");
"use strict";

//import el from "../lib/vuejs-datepicker/locale/translations/el";

function dateDiffInDays(a, b) {
    var end = new moment(a);
    var start = new moment(b);

    return moment.duration(start.diff(end)).days()
}

var searchBar = document.getElementById("searchBar");
searchBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        window.location.href = "/arama/" + searchBar.value
    }
});

var events = (function () {

    function initialize() {
        $(function () {
            $(".episodeBtn").click(function () {
                var e = $(this);
                //e.addClass("selected").siblings('li.selected').removeClass('selected');
                window.location.href = "/" + e.data("slug");
            });

            $(".flx-block").click(function () {
                var e = $(this);
                //e.addClass("selected").siblings('li.selected').removeClass('selected');
                window.location.href = e.data("href");
            });

            $(".article_comment.spoiler").click(function () {
                $(this).addClass("is-visible");
            });

            $(".sourceBtn").click(function () {
                var e = $(this);
                e.addClass("selected").siblings('li.selected').removeClass('selected');

                var pve = localStorage.getItem("preVideo_" + e.data("eid"))
                if (pve != null && dateDiffInDays(pve, new Date().toISOString()) == 0) {
                    axios.post("/api/sourcePlayer/" + e.data("id"))
                        .then(function (response) {
                            if (response.status == 200) {
                                $("#videoPlayer").html(response.data.source);
                                $("#contributerNotes").html(response.data.contributerNotes);
                            }
                        });
                }
                else {
                    axios.post("/api/preVideoAd/" + e.data("id"))
                        .then(function (response) {
                            $("#videoPlayer").html(response.data);
                            localStorage.setItem("preVideo_" + e.data("eid"), new Date().toISOString())
                        });
                }
            });
            
            $(document).on('change', ':file', function () {
                var input = $(this),
                    numFiles = input.get(0).files ? input.get(0).files.length : 1,
                    label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
                input.trigger('fileselect', [numFiles, label]);
            });

            $(':file').on('fileselect', function (event, numFiles, label) {

                var input = $(this).parents('.input-group').find(':text'),
                    log = numFiles > 1 ? numFiles + ' files selected' : label;

                if (input.length) {
                    input.val(log);
                } else {
                    if (log) alert(log);
                }

            });
        });
    };

    return {
        initialize: initialize
    };

}());

var animeDetail = (function () {
    function initialize() {
        $(function () {
            $("#list-buttons :input").change(function () {
                var val = $(this).val();

                axios.post('/api/list',
                    {
                        animeId: id,
                        listType: val
                    })
                    .then(function (response) {
                        console.log(response);
                    });

            });

            $(".fa-thumbs-down").on("click",function () {
                var meta = $("ul.post-meta");

                axios.post('/api/like',
                    {
                        animeId: id,
                        likeType: 2
                    })
                    .then(function (response) {
                        meta.html(response.data);
                    });

            });

            $(".fa-thumbs-up").on("click",function () {
                var meta = $("ul.post-meta");

                axios.post('/api/like',
                    {
                        animeId: id,
                        likeType: 1
                    })
                    .then(function (response) {
                        meta.html(response.data);
                    });

            });

        });
    }

    return {
        initialize: initialize
    };

}());

var animeWatch = (function () {

    var animeId;
    var episodeId;
    var fansubId;
    var fansubUrl;
    var fansubName;

    function initialize(aId, eId, fId, fNm, fUrl) {
        animeId = aId;
        episodeId = eId;
        fansubId = fId;
        fansubName = fNm;
        fansubUrl = fUrl;

        $(function () {
            $('.fansubSelector').click(function () {
                fansubId = $(this).data('fid');
                fansubName = $(this).data('fad');
                fansubUrl = $(this).data('furl');

                $('.fansubSelector').each(function(i,v){
                    $(v).removeClass("active");
                });
                $(this).addClass("active");

                load();
            });

            $('#btn-hataBildir').click(function () {
                var videoId = $(".sourceBtn.selected").data("id");
                var sorunId = $("input[name='bolumHataRadio']:checked").val();
                var feedbackTxt = $('textarea#inputHelpBlock').val();

                axios.post('/api/hataBildir',
                    {
                        animeId: animeId,
                        episodeId: episodeId,
                        videoId: videoId,
                        problemId: sorunId,
                        feedback: feedbackTxt
                    })
                    .then(function (response) {
                        console.log(response)

                        if(response.status == 200)
                            $(".modal-body").prepend('<div class="alert alert-success" role="alert">Bildiriminiz iÃ§in teÅekkÃ¼rler, en kÄ±sa sÃ¼rede ilgilenilecektir.</div>')
                        else
                            $(".modal-body").prepend('<div class="alert alert-warning" role="alert">Bir sorundan dolayÄ± Åuan da bildiriminizi alamÄ±yoruz, lÃ¼tfen daha sonra tekrar deneyiniz.</div>')
                    })
                    .catch(function(error) {
                        $(".modal-body").prepend('<div class="alert alert-error" role="alert">Bir sorundan dolayÄ± Åuan da bildiriminizi alamÄ±yoruz, lÃ¼tfen daha sonra tekrar deneyiniz.</div>')
                    });
            });

            $('input[name="watched"]').change(function () {
                var val = $(this).val();

                axios.post('/api/watch',
                    {
                        animeId: animeId,
                        episodeId: episodeId,
                        status: val
                    })
                    .then(function (response) {
                        $(this).val(response);
                    });
            });

            $("i.fa-thumbs-down").on("click",function () {
                var meta = $("ul.post-meta");

                axios.post('/api/elike',
                    {
                        animeId: animeId,
                        episodeId: episodeId,
                        likeType: 2
                    })
                    .then(function (response) {
                        meta.html(response.data);
                    });

                return false;
            });

            $("i.fa-thumbs-up").on("click",function () {
                var meta = $("ul.post-meta");

                axios.post('/api/elike',
                    {
                        animeId: animeId,
                        episodeId: episodeId,
                        likeType: 1
                    })
                    .then(function (response) {
                        meta.html(response.data);
                    });

                return false;
            });

            load();
        });
    }

    function load() {
        $('#fansubInfoLink').attr('href', fansubUrl).attr('alt', fansubName).text(fansubName);

        axios.post("/api/fansubSources",
            {
                EpisodeId: episodeId,
                FansubId: fansubId
            })
            .then(function (response) {
                $("#sourceList").html(response.data);
            });
    }

    return {
        initialize: initialize,
        load: load
    };

}());
}

/*
     FILE ARCHIVED ON 16:11:23 Jul 20, 2026 AND RETRIEVED FROM THE
     INTERNET ARCHIVE ON 17:35:53 Sep 13, 2026.
     JAVASCRIPT APPENDED BY WAYBACK MACHINE, COPYRIGHT INTERNET ARCHIVE.

     ALL OTHER CONTENT MAY ALSO BE PROTECTED BY COPYRIGHT (17 U.S.C.
     SECTION 108(a)(3)).
*/
/*
playback timings (ms):
  captures_list: 0.401
  exclusion.robots: 0.032
  exclusion.robots.policy: 0.023
  esindex: 0.007
  cdx.remote: 6.57
  LoadShardBlock: 373.512 (3)
  PetaboxLoader3.datanode: 318.379 (4)
  PetaboxLoader3.resolve: 44.849 (2)
  load_resource: 54.898
*/