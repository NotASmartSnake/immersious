let pauseMenuElements = []

class InputQueue {
    #inputs = 0;

    addInput() {
        // first input within 300ms will cause inputs to equal 1
        // subsequent inputs will cause it to be higher
        this.#inputs += 1;
        setTimeout(() => {
            // after 300ms from the first input, inputs is reset to zero
            this.#inputs = 0;
        }, 300);
    }

    getInput() {
        if (this.#inputs == 1) {
            return "tap";
        } else {
            return "doubleTap";
        }
    }
}

class InputListener {
    #startTime;
    #elapsedTime;
    fingerPosition = [0, 0];
    queue = new InputQueue();

    touchStart(e) {
        // method will be called from a touchstart event
        this.fingerPosition[0] = e.touches[0].clientX;
        this.fingerPosition[1] = e.touches[0].clientY;
        this.#startTime = new Date().getTime();
    }

    touchEnd() {
        // method will be called from a touchend event
        this.#elapsedTime = this.#startTime - new Date().getTime();
    }

    getInputType() {
        if (this.#elapsedTime > 500) {
            // early exit if the input takes over half a second
            return null;
        }

        // add input to the queue
        this.queue.addInput();
        // get current input type from the queue
        return this.queue.getInput();
    }
}

class PauseMenuElement {
    constructor(element) {
        this.element = element;
        pauseMenuElements.push(this);
        this.element.hidden = false;
    }
    
    hide() {
        this.element.hidden = true;
    }

    show() {
        this.element.hidden = false;
    }
}

class ProgressTime extends PauseMenuElement {
    constructor(total) {
        super(document.getElementById("progressTime"));
        this.total = this.convertSeconds(total);
        this.updateDisplay(0);
    }

    convertSeconds(seconds) {
        let minutes = String(Math.floor(seconds / 60));
        let readableSeconds = String(Math.floor(seconds % 60));
        
        if (minutes.length == 1) {
            minutes = "0" + minutes;
        }
        if (readableSeconds.length == 1) {
            readableSeconds = "0" + readableSeconds;
        }

        return `${minutes}:${readableSeconds}`;
    }

    updateDisplay(newTime) {
        let readableNew = this.convertSeconds(newTime);
        this.element.innerHTML = `${readableNew} / ${this.total}`
    }
}

class ProgressBar extends PauseMenuElement {
    constructor(total) {
        super(document.getElementById("progress"))
        this.element.max = total;
    }

    getCurrentTime() {
        return this.element.value;
    }

    setCurrentTime(newTime) {
        this.element.value = newTime;
    }
}

class Subtitle {
    showing = false;

    constructor(text) {
        this.text = text;
    }

    display() {
        this.element = document.createElement("p");
        this.element.textContent = this.text;
        this.showing = true;
        document.getElementById("subtitleArea").appendChild(this.element);
    }

    destroy() {
        this.element.remove();
        this.showing = false;
    }

    prepare(start, end, videoPlayer) {
        videoPlayer.addEventListener("timeupdate", e => {
            let miliseconds = Math.round(e.target.currentTime * 1000);

            if (miliseconds >= start && miliseconds < end) {
                if (this.showing == false) {
                    this.display();
                }
            }

            if (miliseconds >= end || miliseconds < start) {
                if (this.showing) {
                    this.destroy();
                }
            }
        })
    }
}

class SubtileManager {

    constructor(textRaw, extension) {
        this.textRaw = textRaw.replaceAll("\r", "");
        this.extension = extension;
    }

    convertToMiliseconds(time) {
        let timesStr = time.split(/[:.,]/);
        if (timesStr[3].length == 2) {
            timesStr[3] += "0";
        }

        let times = []
        for (let i = 0; i < timesStr.length; i++) {
            times.push(Number(timesStr[i]));
        }

        const totalMiliseconds = times[0] * 3600000 + times[1] * 60000 + times[2] * 1000 + times[3];
        return totalMiliseconds;
    }

    stripTags(textTag) {
        // regex removes all tags from a string
        const text = textTag.replace(/<\/?[^>]+(>|$)/g, "");
        return text;
    }

    decodeASS() {
        // I know it's gross, just don't look.
        const lines = this.textRaw.split("\n");
        const firstSubtitleLine = lines.indexOf("[Events]") + 2;

        for (let i = firstSubtitleLine; i < lines.length; i++) {
            let [, start, end, , , , , , , text] = lines[i].split(",");

            start = this.convertToMiliseconds(start);
            end = this.convertToMiliseconds(end);

            const sub = new Subtitle(text);
            sub.prepare(start, end, VideoPlayer.player);

        }
    }

    decodeSRT() {
        // I know it's gross, just don't look.
        const lines = this.textRaw.split("\n\n").filter(a => a != "");
        for (let i = 0; i < lines.length; i++) {
            const splitLine = lines[i].split("\n");
            const timing = splitLine[1];
            let [start, end] = timing.split(" --> ");

            start = this.convertToMiliseconds(start);
            end = this.convertToMiliseconds(end);

            let text = splitLine.filter(a => a != timing && a != i + 1).join("\n");
            text = this.stripTags(text);

            const sub = new Subtitle(text);
            sub.prepare(start, end, VideoPlayer.player);
        }
    }

    decodeSubtiles() {
        if (this.extension == "ass") {
            this.decodeASS();
        }
        else if (this.extension == "srt") {
            this.decodeSRT();
        }
        else {
            console.log("Only SRT and ASS files supported")
        }
        
    }
}

class VideoPlayer {
    static player = document.getElementById("player");
    #isPlaying = false;

    manageVideo() {
        const progressBar = new ProgressBar(player.duration);
        const progressTime = new ProgressTime(player.duration);
        const listener = new InputListener(this);
        new PauseMenuElement(document.getElementById("subtitleButton"));

        // update the time if the progress bar is changed
        progressBar.element.addEventListener("input", (e) => {
            progressBar.setCurrentTime(e.target.value);
            progressTime.updateDisplay(e.target.value);
            player.currentTime = e.target.value;
        })

        // update the progress bar if needed
        player.addEventListener("timeupdate", () => {
            if (player.currentTime > progressBar.getCurrentTime()) {
                progressBar.setCurrentTime(Math.floor(player.currentTime));
                progressTime.updateDisplay(Math.floor(player.currentTime))
            }
        });

        // call to the InputListener when an input has occured on the video player
        player.addEventListener("touchstart", (e) => {
            listener.touchStart(e);
        });

        // manage the input once the input has ended
        player.addEventListener("touchend", () => {
            listener.touchEnd();

            // get input type from the listener and process them in the video player
            this.manageInputs(listener.getInputType(), listener.fingerPosition);
        });

        // show pause menu when paused
        player.addEventListener("pause", () => {
            for(let i = 0; i < pauseMenuElements.length; i++) {
                pauseMenuElements[i].show();
            }
        });

        // hide pause menu when unpaused
        player.addEventListener("play", () => {
            for(let i = 0; i < pauseMenuElements.length; i++) {
                pauseMenuElements[i].hide();
            }
        });
    }

    openVideo(url) {
        document.getElementById("loadVideo").hidden = true;
        player.src = url;
        player.load();

        // call manageVideo function when video has loaded
        player.addEventListener("durationchange", () => {
            this.manageVideo();
        });
    }

    play() {
        this.#isPlaying = true;
        player.play();
    }

    pause() {
        this.#isPlaying = false;
        player.pause();
    }

    skim(seconds) {
        player.currentTime += seconds;
        this.play();
    }

    manageInputs(inputType, fingerPosition) {
        // perform different actions depending on the input type
        switch (inputType) {
            case "tap":
                if (!this.#isPlaying) {
                    this.play();
                } else {
                    this.pause();
                }
                break;

            case "doubleTap":
                if (fingerPosition[0] >= player.clientWidth / 2) {
                    this.skim(5);
                } else {
                    this.skim(-5);
                }
        }
    }
}

function loadSubtitles() {
    const subInput = document.getElementById("subtitleButton");

    subInput.onchange = () => {
        const file = subInput.files[0];
        const fileExtension = file.name.split(".").at(-1);

        const reader = new FileReader();
        reader.readAsText(file);
        
        reader.addEventListener("load", () => {
            const manager = new SubtileManager(reader.result, fileExtension);
            manager.decodeSubtiles();
        });
    }
}

function grabFile() {
    // user picks a file with the input element
    const vidInput = document.getElementById("videoInput");
    
    // when the file has loaded
    vidInput.onchange = () => {
        const file = vidInput.files[0];
        const fileURL = window.URL.createObjectURL(file);

        // create the video player
        const player = new VideoPlayer();
        player.openVideo(fileURL);
    }
}

function websiteLoaded() {
    let hiddenElements = document.getElementsByClassName("hidden");
    for (let i = 0; i < hiddenElements.length; i++) {
        hiddenElements[i].hidden = true;
    }
}
