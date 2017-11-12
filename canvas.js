class GameArea {
    constructor () {
        const gameWidth = 450;
        const gameHeight = 600;

        this.isLoading = true;

        this.canvas = document.createElement('canvas');
        this.canvas.width = gameWidth;
        this.canvas.height = gameHeight;
        this.context = this.canvas.getContext('2d');

        this.frameNumber = 0;
        this.gameInterval = null;
        this.liftVelocity = 17;

        this.imageHandler = new ImageHandler();

        this.imageHandler.fetchImages().then(() => {
            this.isLoading = false;

            this.character = new Character(this.imageHandler, gameWidth / 3, (gameHeight / 2) - this.liftVelocity);
            this.ground = new Ground(this.imageHandler, this.canvas.width, this.canvas.height);
            this.tubes = [];

            this.addEventListeners();
            this.updateGame(true);

            document.getElementById('game').appendChild(this.canvas);
        });
    }

    start () {
        if (this.isLoading) {
            console.warn('game files are still loading');

            return;
        }

        this.gameInterval = setInterval(() => this.updateGame(), 20);
    }

    stopGame (message) {
        clearInterval(this.gameInterval);

        if (message) {
            setTimeout(() => {
                alert(message);
            }, 5);
        }
    }

    updateGame (noUpdate) {
        this.frameNumber++;
        this.clear();

        const background = this.imageHandler.getImage('background');
        this.context.drawImage(background, 0, 0, this.canvas.width, this.canvas.height - 20);

        if (!noUpdate) {
            this.ground.update();
        }

        this.ground.draw(this.context);

        if (!noUpdate) {
            this.character.update();
        }

        if (this.character.isOffScreen(this.canvas.height)) {
            this.stopGame('you died.');
        }

        this.tubes = this.tubes.filter(tube => !tube.isOffScreen());

        if ((this.frameNumber / 110) % 1 === 0) {
            this.tubes.push(new Tube(this.imageHandler, this.canvas.height, this.canvas.width));
        }

        this.tubes.forEach(tube => {
            if (!noUpdate) {
                tube.update();
            }

            if (tube.collidesWith(this.character)) {
                this.stopGame('you died.');
            }

            tube.draw(this.context);
        });

        this.character.draw(this.context);
    }

    changeCharacterVelocity () {
        if (this.gameInterval === null) {
            this.start();
        }

        this.character.velocity = this.liftVelocity;
    }

    clear () {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    addEventListeners () {
        this.canvas.addEventListener('mousedown', () => {
            this.changeCharacterVelocity();
        });

        window.addEventListener('keydown', (event) => {
            if (event.keyCode === 32) {
                this.changeCharacterVelocity();
            }
        });
    }
}

class Tube {
    constructor (imageHandler, canvasHeight, canvasWidth) {
        this.width = 100;
        this.moveSpeed = 3;
        this.minHeight = 50;
        this.minSpace = 130;
        this.imageHandler = imageHandler;
        this.canvasHeight = canvasHeight;
        this.canvasWidth = canvasWidth;
        this.x = canvasWidth;

        const tubeHeights = this.generateTubeHeights();

        this.topTubeHeight = tubeHeights[ 0 ];
        this.bottomTubeHeight = tubeHeights[ 1 ];
    }

    draw (context) {
        const tubeImageBottom = this.imageHandler.getImage('pipe');
        const tubeImageTop = this.imageHandler.getImage('pipe-rev');
        const calculatedTubeImageHeight = tubeImageBottom.height / (tubeImageBottom.width / this.width);

        context.drawImage(tubeImageTop, this.x, 0 - calculatedTubeImageHeight + this.topTubeHeight, this.width, calculatedTubeImageHeight);
        context.drawImage(tubeImageBottom, this.x, this.canvasHeight - this.bottomTubeHeight, this.width, calculatedTubeImageHeight);
    }

    update () {
        this.x -= this.moveSpeed;
        if (this.x > ((this.canvasWidth / 3) - this.moveSpeed - (this.width / 2)) && this.x < ((this.canvasWidth / 3) - (this.width / 2))) {
            window.dispatchEvent(new Event('score'));
        }
    }

    isOffScreen () {
        return (this.x + this.width) < 0;
    }

    collidesWith (characterObject) {
        const rectangleIntersect = (rectA, rectB) => {
            return !(rectB.left > rectA.right ||
                rectB.right < rectA.left ||
                rectB.top > rectA.bottom ||
                rectB.bottom < rectA.top);
        };

        const characterBox = {
            top: characterObject.y,
            left: characterObject.x,
            bottom: characterObject.y + characterObject.height,
            right: characterObject.x + characterObject.width,
        };

        const topTubeBox = {
            top: 0,
            left: this.x,
            bottom: this.topTubeHeight,
            right: this.x + this.width,
        };

        const bottomTubeBox = {
            top: this.canvasHeight - this.bottomTubeHeight,
            left: this.x,
            bottom: this.canvasHeight,
            right: this.x + this.width,
        };

        return !!(rectangleIntersect(characterBox, topTubeBox) || rectangleIntersect(characterBox, bottomTubeBox));
    }

    generateTubeHeights () {
        const tubeAHeight = Math.floor(Math.random() * (this.canvasHeight / 2 - this.minHeight)) + this.minHeight;
        const tubeBHeight = (this.canvasHeight - tubeAHeight - this.minSpace) - (Math.floor(Math.random() * this.minSpace));

        return [ tubeAHeight, tubeBHeight ];
    }
}

class Ground {
    constructor (imageHandler, canvasWidth, canvasHeight) {
        this.imageHandler = imageHandler;
        this.groundImage = this.imageHandler.getImage('ground');
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.currentOffset = 0;
        this.moveSpeed = 3;
    }

    draw (context) {
        for (let i = -this.canvasWidth / 2; i <= this.canvasWidth * 2; i += this.groundImage.width / 2) {
            context.save();
            context.drawImage(this.groundImage, i - this.currentOffset, this.canvasHeight - this.groundImage.height / 2 + 20, this.groundImage.width / 2, this.groundImage.height / 2);
            context.restore();
        }
    }

    update () {
        if (this.currentOffset >= this.groundImage.width / 2) {
            this.currentOffset = 0;
        }

        this.currentOffset += this.moveSpeed;
    }
}

class Character {
    constructor (imageHandler, startX, startY) {
        this.imageHandler = imageHandler;
        this.width = 50;
        this.height = 36;
        this.gravity = 1;
        this.velocity = 0;
        this.x = startX;
        this.y = startY;
    }

    update () {
        this.velocity -= this.gravity;
        this.y -= this.velocity * 0.5;
    }

    draw (context) {
        context.drawImage(this.imageHandler.getImage('bird'), this.x - 2, this.y - 2, this.width + 2, this.height + 2);
    }

    isOffScreen (screenHeight) {
        return this.y < 0 || (this.y + this.height) > screenHeight - 20;
    }
}

class ImageHandler {
    constructor () {
        this.images = {
            'background': 'images/background.png',
            'bird': 'images/bird.png',
            'ground': 'images/ground.png',
            'pipe': 'images/pipe.png',
            'pipe-rev': 'images/pipe-rev.png',
        };
    }

    getImage (key) {
        return this.images[ key ];
    }

    fetchImages () {
        const imagePromises = [];

        for (const imageKey in this.images) {
            if (this.images.hasOwnProperty(imageKey)) {
                imagePromises.push(new Promise((resolve) => {
                    const image = new Image();

                    image.onload = () => {
                        this.images[ imageKey ] = image;
                        resolve(image);
                    };

                    image.src = this.images[ imageKey ];
                }));
            }
        }

        return Promise.all(imagePromises);
    }
}
