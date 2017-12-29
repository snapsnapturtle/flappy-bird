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

        this.imageHandler = new ImageHandler(dataSetClassic);
        this.imageHandler.fetchImage().then(() => {
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

        this.gameInterval = setInterval(() => this.updateGame(), 15);
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
        this.context.drawImage(
            background.imageElement,
            background.sourceX,
            background.sourceY,
            background.sourceWidth,
            background.sourceHeight,
            0,
            0,
            this.canvas.width,
            this.canvas.height - 20,
        );

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

        const calculatedTubeImageHeight = tubeImageBottom.sourceHeight / (tubeImageBottom.sourceWidth / this.width);

        context.drawImage(
            tubeImageTop.imageElement,
            tubeImageTop.sourceX,
            tubeImageTop.sourceY,
            tubeImageTop.sourceWidth,
            tubeImageTop.sourceHeight,
            this.x,
            0 - calculatedTubeImageHeight + this.topTubeHeight,
            this.width,
            calculatedTubeImageHeight,
        );

        context.drawImage(
            tubeImageBottom.imageElement,
            tubeImageBottom.sourceX,
            tubeImageBottom.sourceY,
            tubeImageBottom.sourceWidth,
            tubeImageBottom.sourceHeight,
            this.x,
            this.canvasHeight - this.bottomTubeHeight,
            this.width,
            calculatedTubeImageHeight,
        );
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
        for (let i = (this.canvasWidth / 2) * -1; i <= this.canvasWidth + (2 * this.groundImage.sourceWidth); i += this.groundImage.sourceWidth) {
            context.save();
            context.drawImage(
                this.groundImage.imageElement,
                this.groundImage.sourceX,
                this.groundImage.sourceY,
                this.groundImage.sourceWidth,
                this.groundImage.sourceHeight,
                i - this.currentOffset,
                this.canvasHeight - this.groundImage.sourceHeight / 2 + 20,
                this.groundImage.sourceWidth,
                this.groundImage.sourceHeight / 2,
            );

            context.restore();
        }
    }

    update () {
        this.currentOffset += this.moveSpeed;

        if (this.currentOffset >= this.groundImage.sourceWidth) {
            this.currentOffset = this.currentOffset - this.groundImage.sourceWidth;
        }
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
        const bird = this.imageHandler.getImage('bird');
        context.drawImage(
            bird.imageElement,
            bird.sourceX,
            bird.sourceY,
            bird.sourceWidth,
            bird.sourceHeight,
            this.x - 2,
            this.y - 2,
            this.width + 2,
            this.height + 2,
        );
    }

    isOffScreen (screenHeight) {
        return this.y < 0 || (this.y + this.height) > screenHeight - 20;
    }
}

class ImageHandler {
    constructor (dataSet) {
        this.data = dataSet;
    }

    fetchImage () {
        return new Promise(resolve => {
            const image = new Image();
            image.onload = resolve;
            image.src = this.data.spriteUrl;
            this.spriteImage = image;
        });
    }

    getImage (identifier) {
        return {
            imageElement: this.spriteImage,
            sourceX: this.data.images[ identifier ][ 0 ],
            sourceY: this.data.images[ identifier ][ 1 ],
            sourceWidth: this.data.images[ identifier ][ 2 ],
            sourceHeight: this.data.images[ identifier ][ 3 ],
        };
    }
}

const dataSetClassic = {
    spriteUrl: 'images/classic-sprite.png',
    images: {
        background: [ 0, 0, 768, 896 ],
        bird: [ 276, 896, 90, 64 ],
        ground: [ 366, 896, 37, 128 ],
        pipe: [ 138, 896, 138, 793 ],
        'pipe-rev': [ 0, 896, 138, 793 ],
    },
};
