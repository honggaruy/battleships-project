document.addEventListener('DOMContentLoaded', () => {
    const userGrid = document.querySelector('.grid-user')
    const computerGrid = document.querySelector('.grid-computer')
    const displayGrid = document.querySelector('.grid-display')
    const ships = document.querySelectorAll('.ship')
    const destroyer = document.querySelector('.destroyer-container')
    const submarine = document.querySelector('.submarine-container')
    const cruiser = document.querySelector('.cruiser-container')
    const battleship = document.querySelector('.battleship-container')
    const carrier = document.querySelector('.carrier-container')
    const startButton = document.querySelector('#start')
    const rotateButton = document.querySelector('#rotate')
    const turnDisplay = document.querySelector('#whose-go')
    const infoDisplay = document.querySelector('#info')

    const singlePlayerButton = document.querySelector('#singlePlayerButton')
    const multiPlayerButton = document.querySelector('#multiPlayerButton')

    const userSquares = []
    const computerSquares = []
    let isHorizontal = true
    let isGameOver = false
    let currentPlayer = 'user'
    const width = 10
    let gameMode = ""
    let playerNum = 0
    let ready = false
    let enemyReady = false
    let allShipPlaced = false
    let shotFired = -1

    // Select Player Mode
    singlePlayerButton.addEventListener('click', startSinglePlayer)
    multiPlayerButton.addEventListener('click', startMultiPlayer)

    // Multi Player Game
    function startMultiPlayer() {
        gameMode = 'multiPlayer'

        const socket = io()

        // Get your player number
        socket.on('player-number', num => {
            if (num === -1) {
                infoDisplay.innerHTML = "Sorry, the server is full"
            } else {
                playerNum = parseInt(num)
                if (playerNum === 1) currentPlayer = 'enemy'
                console.log(`playerNum: ${playerNum}`)

                // Get other player status
                socket.emit('check-players')
            }
        })

        // Another player has connected or disconnected
        socket.on('player-connection', num => {
            console.log(`player number ${num} has connected or disconnected`)
            playerConnectedOrDisconnected(num)
        })

        // On enemy ready
        socket.on('enemy-ready', num => {
            enemyReady = true
            playerReady(num)
            if (ready) playGameMulti(socket)
        })

        // Check player status
        socket.on('check-players', players => {
            players.forEach((p, i) => {
                if(p.connected) playerConnectedOrDisconnected(i)
                if(p.ready) {
                    playerReady(i)
                    if(i != playerNum) enemyReady = true
                }
            })
        })

        // On Timeout
        socket.on('timeout', () => {
            infoDisplay.innerHTML = 'Your have reached the 10 minute limit'
        })

        // Ready button click
        startButton.addEventListener('click', () => {
            if(allShipPlaced) playGameMulti(socket)
            else infoDisplay.innerHTML = "모든 배를 배치해주세요!"
        })

        // Setup event listeners for firing
        computerSquares.forEach(square => {
            square.addEventListener('click', () => {
                if(currentPlayer === 'user' && ready && enemyReady) {
                    shotFired = square.dataset.id
                    socket.emit('fire', shotFired)
                }
            })
        })

        // On fire received
        socket.on('fire', id => {
            enemyGo(id)
            const square = userSquares[id]
            socket.emit('fire-reply', square.classList)
            playGameMulti(socket) 
        })

        // On Fire Reply Received
        socket.on('fire-reply', classList => {
            revealSquare(classList)
            playGameMulti(socket)
        })


        function playerConnectedOrDisconnected(num) {
            let player = `.p${parseInt(num) + 1}`
            document.querySelector(`${player} .connected span`).classList.toggle('green')
            if(parseInt(num) === playerNum) document.querySelector(player).style.fontWeight = 'bold'
        }
   }

    // Single Player
    function startSinglePlayer(player) {
        gameMode = "singlePlayer"

        // Computer random generate
        shipArray.forEach(ship => generate(ship))

        startButton.addEventListener('click', playGameSingle)
    }
    
    // Create Board
    function createBoard(grid, squares) {
        for (let i = 0; i < width * width; i++) {
            const square = document.createElement('div')
            square.dataset.id = i
            grid.appendChild(square)
            squares.push(square)
        }
    }
    createBoard(userGrid, userSquares)
    createBoard(computerGrid, computerSquares)

    // Ships
    const shipArray = [
        {
            names: 'destroyer',
            directions: [
                [0, 1],
                [0, width]
            ]
        },
        {
            names: 'submarine',
            directions: [
                [0, 1, 2],
                [0, width, width*2]
            ]
        },
        {
            names: 'cruiser',
            directions: [
                [0, 1, 2],
                [0, width, width*2]
            ]
        },
        {
            names: 'battleship',
            directions: [
                [0, 1, 2, 3],
                [0, width, width*2, width*3]
            ]
        },
        {
            names: 'carrier',
            directions: [
                [0, 1, 2, 3, 4],
                [0, width, width*2, width*3, width*4]
            ]
        },
    ]


    // Draw the computers ships in random locations
    function generate(ship) {
        let randomDirection = Math.floor(Math.random() * ship.directions.length)
        const current = ship.directions[randomDirection]
        const edgeChecker = current.slice(0, -1)
        if (randomDirection === 0 ) direction = 1
        if (randomDirection === 1 ) direction = 10
        let randomStart = Math.abs(Math.floor(Math.random() * computerSquares.length - (ship.directions[0].length * direction)))

        const isTaken = current.some(index => computerSquares[randomStart + index].classList.contains('taken'))
        const isAtRightEdge = !randomDirection && edgeChecker.some(index => (randomStart + index) % width === width - 1)
        const isAtLeftEdge = !randomDirection && current.some(index => (randomStart + index) % width === 0) 

        if (!isTaken && !isAtRightEdge) 
            current.forEach(index => computerSquares[randomStart + index].classList.add('taken', ship.names))
        else generate(ship)
    }

    //shipArray.forEach(ship => generate(ship))

    // rotate that ships
    function rotate() {
        destroyer.classList.toggle('destroyer-container-vertical')
        submarine.classList.toggle('submarine-container-vertical')
        cruiser.classList.toggle('cruiser-container-vertical')
        battleship.classList.toggle('battleship-container-vertical')
        carrier.classList.toggle('carrier-container-vertical')
        isHorizontal = !isHorizontal
    }
    rotateButton.addEventListener('click', rotate)

    // move around user ship
    ships.forEach(ship => ship.addEventListener('dragstart', dragStart))
    userSquares.forEach(square => square.addEventListener('dragstart', dragStart))
    userSquares.forEach(square => square.addEventListener('dragover', dragOver))
    userSquares.forEach(square => square.addEventListener('dragenter', dragEnter))
    userSquares.forEach(square => square.addEventListener('dragleave', dragLeave))
    userSquares.forEach(square => square.addEventListener('drop', dragDrop))
    userSquares.forEach(square => square.addEventListener('dragend', dragEnd))

    let selectedShipNameWithIndex
    let draggedShip
    let draggedShipLength


    ships.forEach(ship => ship.addEventListener('mousedown', (e) => {
        selectedShipNameWithIndex = e.target.id
        console.log(selectedShipNameWithIndex)
    }))

    function dragStart() {
        draggedShip = this
        draggedShipLength = this.children.length
        console.log(draggedShip)
        console.log(draggedShip.children)
        console.log(`dragStart: ${draggedShip.childNodes}, ${draggedShipLength}`)
    }

    function dragOver(e) {
        e.preventDefault()
    }

    function dragEnter(e) {
        e.preventDefault()
    }

    function dragLeave() {
        console.log('drag leave')
    }

    function dragDrop() {
        const shipNameWithLastId = draggedShip.lastElementChild.id
        const shipClass =  shipNameWithLastId.slice(0, -2)
        //console.log(shipClass)
        const lastShipIndex = parseInt(shipNameWithLastId.substr(-1))
        let shipLastId = lastShipIndex + parseInt(this.dataset.id)
        //console.log(`shipLastId1: ${shipNameWithLastId}, ${this.dataset.id}, ${lastShipIndex}, ${shipLastId}`)
        const notAllowedHorizontal = Array.from({length: 40}, (_, i) => (i - Math.floor(i/10)*10)*10 + Math.floor((i/10))) 
        const notAllowedVertical = Array.from({length: 40}, (_, i) => 99 - i) 
        const newNotAllowedHorizontal = notAllowedHorizontal.splice(0, 10 * lastShipIndex)
        const newNotAllowedVertical = notAllowedVertical.splice(0, 10 * lastShipIndex)
        //console.log(newNotAllowedHorizontal)
        //console.log(newNotAllowedVertical)

        selectedShipIndex = parseInt(selectedShipNameWithIndex.substr(-1))
        shipLastId = shipLastId - selectedShipIndex
        //console.log(`shipLastId2:${selectedShipNameWithIndex}, ${selectedShipIndex}, ${shipLastId}`)

        //console.log(draggedShipLength)
        if (isHorizontal && !newNotAllowedHorizontal.includes(shipLastId)) {
            for (let i=0; i < draggedShipLength; i++) {
                userSquares[parseInt(this.dataset.id) - selectedShipIndex + i].classList.add('taken', shipClass)
            }
        } else if (!isHorizontal && !newNotAllowedVertical.includes(shipLastId)) {
            for (let i=0; i < draggedShipLength; i++) {
                userSquares[parseInt(this.dataset.id) - selectedShipIndex + width*i].classList.add('taken', shipClass)
            }
        } else return

        displayGrid.removeChild(draggedShip)

        // diplayGrid에서 모든 ship 클래스가 사라지면 배치가 끝난것임
        if(!displayGrid.querySelector('.ship')) allShipPlaced = true
    }

    function dragEnd() {
        console.log('dragend')
    }

    // Game Logic for MultiPlayer
    function playGameMulti(socket) {
        if(isGameOver) return
        if(!ready) {
            socket.emit('player-ready')
            ready = true
            playerReady(playerNum)
        }

        if(enemyReady) {
            if(currentPlayer === 'user') {
                turnDisplay.innerHTML = 'Your Go'
            }
            if(currentPlayer === 'enemy') {
                turnDisplay.innerHTML = "Enemy's Go"
            }
        }
    }

    function playerReady(num) {
        let player = `.p${parseInt(num) + 1}`
        document.querySelector(`${player} .ready span`).classList.toggle('green')
    }

    // Game Logic for Single Player
    function playGameSingle() {
        if (isGameOver) return
        if (currentPlayer === 'user') {
            turnDisplay.innerHTML = "Your Go"
            computerSquares.forEach(square => square.addEventListener('click', function(e){
                shotFired = square.dataset.id
                revealSquare(square.classList)
            }))
        } 
        if (currentPlayer === 'enemy') {
            turnDisplay.innerHTML = "Computers Go"
            setTimeout(enemyGo, 1000)
        }
        checkForWins() 
    }


    let destroyerCount = 0
    let submarineCount = 0
    let cruiserCount = 0
    let battleshipCount = 0
    let carrierCount = 0

    function revealSquare(classList) {
        console.log(`reveal1: ${shotFired}`)
        const enemySquare = computerGrid.querySelector(`div[data-id='${shotFired}']`)
        const obj = Object.values(classList)
        if (!enemySquare.classList.contains('boom') && currentPlayer === 'user' && !isGameOver) {
            if (obj.includes('destroyer')) destroyerCount++
            if (obj.includes('submarine')) submarineCount++
            if (obj.includes('cruiser')) cruiserCount++
            if (obj.includes('battleship')) battleshipCount++
            if (obj.includes('carrier')) carrierCount++
        }

        console.log(`reveal2: ${obj}`)
        if (obj.includes('taken')) {
            enemySquare.classList.add('boom')
        } else {
            enemySquare.classList.add('miss')
        }
        checkForWins()
        currentPlayer = 'enemy'
        if(gameMode === 'singlePlayer') playGameSingle()
    }

    let cpuDestroyerCount = 0
    let cpuSubmarineCount = 0
    let cpuCruiserCount = 0
    let cpuBattleshipCount = 0
    let cpuCarrierCount = 0

    function enemyGo(square) {
        if (gameMode ==='singlePlayer') square = Math.floor(Math.random() * userSquares.length)
        if (!userSquares[square].classList.contains('boom')) {
           userSquares[square].classList.add('boom')
           if (userSquares[square].classList.contains('destroyer')) cpuDestroyerCount++
           if (userSquares[square].classList.contains('submarine')) cpuSubmarineCount++
           if (userSquares[square].classList.contains('cruiser')) cpuCruiserCount++
           if (userSquares[square].classList.contains('battleship')) cpuBattleshipCount++
           if (userSquares[square].classList.contains('carrier')) cpuCarrierCount++
           checkForWins()
        } else if (gameMode === 'singlePlayer') enemyGo()
        currentPlayer = 'user'
        turnDisplay.innerHTML = 'Your Go'
    }

    function checkForWins() {
        let enemy = 'computer'
        if(gameMode === 'multiPlayer') enemy = 'enemy'
        if (destroyerCount === 2) {
            infoDisplay.innerHTML = `You sunk the ${enemy}'s destroyer`
            destroyerCount = 10 
        }
        if (submarineCount === 3) {
            infoDisplay.innerHTML = `You sunk the ${enemy}'s submarine`
            submarineCount = 10
        }
        if (cruiserCount === 3) {
            infoDisplay.innerHTML = `You sunk the ${enemy}'s cruiser`
            cruiserCount = 10 
        }
        if (battleshipCount === 4) {
            infoDisplay.innerHTML = `You sunk the ${enemy}'s battleship`
            battleshipCount = 10 
        }
        if (carrierCount === 5) {
            infoDisplay.innerHTML = `You sunk the ${enemy}'s carrier`
            carrierCount = 10 
        }

        if (cpuDestroyerCount === 2) {
            infoDisplay.innerHTML = `${enemy} sunk your destroyer`
            cpuDestroyerCount = 10 
        }
        if (cpuSubmarineCount === 3) {
            infoDisplay.innerHTML = `${enemy} sunk your submarine`
            cpuSubmarineCount = 10
        }
        if (cpuCruiserCount === 3) {
            infoDisplay.innerHTML = `${enemy} sunk your cruiser`
            cpuCruiserCount = 10 
        }
        if (cpuBattleshipCount === 4) {
            infoDisplay.innerHTML = `${enemy} sunk your battleship`
            cpuBattleshipCount = 10 
        }
        if (cpuCarrierCount === 5) {
            infoDisplay.innerHTML = `${enemy} sunk your carrier`
            cpuCarrierCount = 10 
        }
        if ((destroyerCount + submarineCount + cruiserCount + battleshipCount + carrierCount) === 50) {
            infoDisplay.innerHTML = "YOU WIN"
            gameOver()
        }
        if ((cpuDestroyerCount + cpuSubmarineCount + cpuCruiserCount + cpuBattleshipCount + cpuCarrierCount) === 50) {
            infoDisplay.innerHTML = `${enemy.toUpperCase()} WINS`
            gameOver()
        }
    }

    function gameOver() {
        isGameOver = true
        startButton.removeEventListener('click', playGameSingle)
    }

})