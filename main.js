const vidInput = document.getElementById("videoInput");
        let listener = null;

        class VideoPlayer {
            player = document.getElementById("player");
            #isPlaying = false;

            constructor(videoURL) {
                this.openVideo(videoURL);
                document.getElementById("loadVideo").hidden = true;
                listener = new InputListener(this);
            }

            openVideo(url) {
                this.player.src = url;
                this.player.load();
            }

            #play() {
                this.#isPlaying = true;
                this.player.play();
            }

            #pause() {
                this.#isPlaying = false;
                this.player.pause();
            }

            manageInputs(inputType) {
                if (inputType == "tap") {
                    if (!this.#isPlaying) {
                        this.#play();
                    } else {
                        this.#pause();
                    }
                }
            }
        }
        
        class InputQueue {
            #inputs = 0;

            addInput() {
                this.#inputs += 1
                if (this.#inputs == 2) {
                    return;
                }
                setTimeout(() => {
                    this.#inputs = 0
                    return
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
            #startFingerPosition = [0, 0];
            #videoPlayer;

            constructor(videoPlayer) {
                this.#videoPlayer = videoPlayer
                this.inputHappened = new CustomEvent("inputhappened");
                this.queue = new InputQueue();
                videoPlayer.player.addEventListener("touchstart", (e) => {
                    listener.touchStart(e);
                });
                videoPlayer.player.addEventListener("touchend", () => {
                    listener.touchEnd();
                });
            }

            touchStart(e) {
                this.#startFingerPosition[0] = e.touches[0].clientX;
                this.#startFingerPosition[1] = e.touches[0].clientY;
                this.#startTime = new Date().getTime();
            }

            touchEnd() {
                this.#elapsedTime = this.#startTime - new Date().getTime();
                this.#videoPlayer.manageInputs(this.getFingerMovement());
            }

            getFingerMovement() {
                if (this.#elapsedTime > 500) {
                    return null;
                }

                this.queue.addInput()
                return this.queue.getInput();
            }
        }

        function grabFile() {
            vidInput.type = "file";
            vidInput.accept = "video/*";
            
            vidInput.onchange = () => {
                let file = vidInput.files[0];
                let fileURL = window.URL.createObjectURL(file);

                currentPlayer = new VideoPlayer(fileURL);
            }
        }
