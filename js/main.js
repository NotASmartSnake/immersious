let PauseMenuElements = []

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

    constructor() {
        this.queue = new InputQueue();
    }

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
        PauseMenuElements.push(this);
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
        // <input type=range> max attribute set to length of the video
        this.element.max = total;
    }

    getCurrentTime() {
        return this.element.value;
    }

    setCurrentTime(newTime) {
        this.element.value = newTime;
    }
}

class VideoPlayer {
    // player is a video element
    player = document.getElementById("player");
    #isPlaying = false;

    constructor(videoURL) {
        this.openVideo(videoURL);
        document.getElementById("loadVideo").hidden = true;

        // call manageVideo function when video has loaded
        this.player.addEventListener("durationchange", () => {
            this.manageVideo();
        });
    }

    manageVideo() {
        const progressBar = new ProgressBar(this.player.duration);
        const progressTime = new ProgressTime(this.player.duration);

        // update the time if the progress bar is changed
        progressBar.element.addEventListener("input", (e) => {
            progressBar.setCurrentTime(e.target.value);
            progressTime.updateDisplay(e.target.value);
            this.player.currentTime = e.target.value;
        })
        // update the progress bar if needed
        this.player.addEventListener("timeupdate", () => {
            if (this.player.currentTime > progressBar.getCurrentTime()) {
                progressBar.setCurrentTime(Math.floor(this.player.currentTime));
                progressTime.updateDisplay(Math.floor(this.player.currentTime))
            }
        });
    }

    openVideo(url) {
        this.player.src = url;
        this.player.load();
    }

    play() {
        this.#isPlaying = true;
        this.player.play();
    }

    pause() {
        this.#isPlaying = false;
        this.player.pause();
    }

    skim(seconds) {
        this.player.currentTime += seconds;
        this.play();
    }

    manageInputs(inputType, fingerPosition) {
        // perform different actions depending on the input type
        switch (inputType) {
            case "tap":
                // pause or play
                if (!this.#isPlaying) {
                    this.play();
                } else {
                    this.pause();
                }
                break;

            case "doubleTap":
                // skim backwards or forwards
                if (fingerPosition[0] >= this.player.clientWidth / 2) {
                    this.skim(5);
                } else {
                    this.skim(-5);
                }
        }
    }
}

function handleEvents(videoPlayer) {
    listener = new InputListener();

    // call to the InputListener when an input has occured on the video player
    videoPlayer.player.addEventListener("touchstart", (e) => {
        listener.touchStart(e);
    });
    videoPlayer.player.addEventListener("touchend", () => {
        listener.touchEnd();

        // get input type from the listener and process them in the video player
        videoPlayer.manageInputs(listener.getInputType(), listener.fingerPosition);
    });

    // control what happens on pausing and playing
    videoPlayer.player.addEventListener("pause", () => {
        for(let i = 0; i < PauseMenuElements.length; i++) {
            PauseMenuElements[i].show();
        }
    });
    videoPlayer.player.addEventListener("play", () => {
        for(let i = 0; i < PauseMenuElements.length; i++) {
            PauseMenuElements[i].hide();
        }
    });
}

function grabFile() {
    // user picks a file with the input element
    const vidInput = document.getElementById("videoInput");
    vidInput.type = "file";
    
    // when the file has loaded
    vidInput.onchange = () => {
        let file = vidInput.files[0];
        let fileURL = window.URL.createObjectURL(file);

        // create the video player
        currentPlayer = new VideoPlayer(fileURL);
        handleEvents(currentPlayer);
    }
}

function websiteLoaded() {
    let hiddenElements = document.getElementsByClassName("hidden");
    for (let i = 0; i < hiddenElements.length; i++) {
        hiddenElements[i].hidden = true;
    }
}
