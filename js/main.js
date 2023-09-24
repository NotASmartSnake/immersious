
class InputQueue {
    #inputs = 0;

    addInput() {
        this.#inputs += 1;
        if (this.#inputs == 2) {
            return;
        }
        setTimeout(() => {
            this.#inputs = 0;
            return;
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
        this.fingerPosition[0] = e.touches[0].clientX;
        this.fingerPosition[1] = e.touches[0].clientY;
        this.#startTime = new Date().getTime();
    }

    touchEnd() {
        this.#elapsedTime = this.#startTime - new Date().getTime();
    }

    getInputType() {
        if (this.#elapsedTime > 500) {
            return null;
        }

        this.queue.addInput();
        return this.queue.getInput();
    }
}

class ProgressBar {
    #bar;
    changed = false;

    constructor(total) {
        this.#bar = document.getElementById("progress");
        this.#bar.max = total;
        console.log(total);
        console.log(this.#bar.max);
        this.#bar.addEventListener("change", () => {
            this.changed = true;
        })
    }

    getCurrentTime() {
        return this.#bar.value;
    }

    setCurrentTime(newTime) {
        this.#bar.value = newTime;
    }
}

class VideoPlayer {
    player = document.getElementById("player");
    #isPlaying = false;

    constructor(videoURL) {
        this.openVideo(videoURL);
        document.getElementById("loadVideo").hidden = true;

        // call manageVideo function when video has loaded
        this.player.addEventListener("durationchange", () => {
            this.manageVideo();
        })
    }

    manageVideo() {
        let progressBar = new ProgressBar(this.player.duration);
        this.player.addEventListener("timeupdate", () => {
            if (progressBar.changed == true) {
                this.player.currentTime = progressBar.getCurrentTime();
                progressBar.changed = false;
            } else if (this.player.currentTime > progressBar.getCurrentTime()) {
                progressBar.setCurrentTime(Math.floor(this.player.currentTime));
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
        switch (inputType) {
            case "tap":
                if (!this.#isPlaying) {
                    this.play();
                } else {
                    this.pause();
                }
                break;

            case "doubleTap":
                if (fingerPosition[0] >= this.player.clientWidth / 2) {
                    this.skim(5);
                } else {
                    this.skim(-5);
                }
        }
    }
}

function handleVideoPlayer(videoPlayer) {
    listener = new InputListener();
    videoPlayer.player.addEventListener("touchstart", (e) => {
        listener.touchStart(e);
    });
    videoPlayer.player.addEventListener("touchend", () => {
        listener.touchEnd();
        videoPlayer.manageInputs(listener.getInputType(), listener.fingerPosition);
    });
}

function grabFile() {
    const vidInput = document.getElementById("videoInput");
    vidInput.type = "file";
    vidInput.accept = "video/*";
    
    vidInput.onchange = () => {
        let file = vidInput.files[0];
        let fileURL = window.URL.createObjectURL(file);

        currentPlayer = new VideoPlayer(fileURL);
        handleVideoPlayer(currentPlayer);
    }
}
