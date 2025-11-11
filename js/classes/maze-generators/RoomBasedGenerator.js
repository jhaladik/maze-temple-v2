// Room-Based Generator
// Creates strategic rooms connected by corridors - teaches spatial reasoning

import { ELEMENTS } from '../../config/constants.js';
import { BaseMazeGenerator } from './BaseMazeGenerator.js';

export class RoomBasedGenerator extends BaseMazeGenerator {
    generate() {
        this.maze = this.createEmptyMaze();
        this.rooms = [];

        // Generate rooms based on complexity
        const roomCount = {
            easy: 3,
            medium: 5,
            hard: 8
        }[this.complexity] || 5;

        const roomSize = {
            easy: { min: 4, max: 6 },
            medium: { min: 3, max: 5 },
            hard: { min: 2, max: 4 }
        }[this.complexity] || { min: 3, max: 5 };

        // Create rooms
        this.createRooms(roomCount, roomSize);

        // Connect rooms with corridors
        this.connectRooms();

        // Add some loops based on complexity
        if (this.complexity !== 'easy') {
            this.addLoops();
        }

        this.metadata.rooms = this.rooms;
        this.analyzeMaze();
        return this.maze;
    }

    createRooms(count, sizeRange) {
        let attempts = 0;
        const maxAttempts = count * 50;

        while (this.rooms.length < count && attempts < maxAttempts) {
            attempts++;

            // Random room size
            const width = Math.floor(Math.random() * (sizeRange.max - sizeRange.min + 1)) + sizeRange.min;
            const height = Math.floor(Math.random() * (sizeRange.max - sizeRange.min + 1)) + sizeRange.min;

            // Random position
            const x = Math.floor(Math.random() * (this.size - width - 4)) + 2;
            const y = Math.floor(Math.random() * (this.size - height - 4)) + 2;

            const room = { x, y, width, height };

            // Check if room overlaps with existing rooms
            if (!this.roomOverlaps(room)) {
                this.carveRoom(room);
                this.rooms.push(room);
            }
        }

        // Ensure we have at least 2 rooms
        if (this.rooms.length < 2) {
            // Force create start and end rooms
            this.carveRoom({ x: 1, y: 1, width: 3, height: 3 });
            this.rooms.push({ x: 1, y: 1, width: 3, height: 3 });

            const endX = this.size - 5;
            const endY = this.size - 5;
            this.carveRoom({ x: endX, y: endY, width: 3, height: 3 });
            this.rooms.push({ x: endX, y: endY, width: 3, height: 3 });
        }
    }

    roomOverlaps(newRoom) {
        for (const room of this.rooms) {
            // Check if rooms overlap (with 2-cell buffer)
            if (!(newRoom.x + newRoom.width + 2 < room.x ||
                  newRoom.x - 2 > room.x + room.width ||
                  newRoom.y + newRoom.height + 2 < room.y ||
                  newRoom.y - 2 > room.y + room.height)) {
                return true;
            }
        }
        return false;
    }

    carveRoom(room) {
        for (let y = room.y; y < room.y + room.height; y++) {
            for (let x = room.x; x < room.x + room.width; x++) {
                if (x > 0 && x < this.size - 1 && y > 0 && y < this.size - 1) {
                    this.maze[y][x] = ELEMENTS.empty;
                }
            }
        }
    }

    connectRooms() {
        // Sort rooms by distance from start
        this.rooms.sort((a, b) => {
            const distA = Math.abs(a.x - 1) + Math.abs(a.y - 1);
            const distB = Math.abs(b.x - 1) + Math.abs(b.y - 1);
            return distA - distB;
        });

        // Connect each room to next room
        for (let i = 0; i < this.rooms.length - 1; i++) {
            this.createCorridor(this.rooms[i], this.rooms[i + 1]);
        }

        // Add extra connections for medium/hard
        if (this.complexity !== 'easy' && this.rooms.length > 3) {
            const extraConnections = this.complexity === 'hard' ? 3 : 2;
            for (let i = 0; i < extraConnections && i < this.rooms.length - 2; i++) {
                const room1 = this.rooms[i];
                const room2 = this.rooms[i + 2];
                this.createCorridor(room1, room2);
            }
        }
    }

    createCorridor(room1, room2) {
        // Get center points of rooms
        const x1 = Math.floor(room1.x + room1.width / 2);
        const y1 = Math.floor(room1.y + room1.height / 2);
        const x2 = Math.floor(room2.x + room2.width / 2);
        const y2 = Math.floor(room2.y + room2.height / 2);

        // Randomly choose L-shaped or direct corridor
        if (Math.random() < 0.5) {
            // Horizontal then vertical
            this.carveCorridor(x1, y1, x2, y1);
            this.carveCorridor(x2, y1, x2, y2);
        } else {
            // Vertical then horizontal
            this.carveCorridor(x1, y1, x1, y2);
            this.carveCorridor(x1, y2, x2, y2);
        }
    }

    carveCorridor(x1, y1, x2, y2) {
        const startX = Math.min(x1, x2);
        const endX = Math.max(x1, x2);
        const startY = Math.min(y1, y2);
        const endY = Math.max(y1, y2);

        for (let x = startX; x <= endX; x++) {
            if (x > 0 && x < this.size - 1 && y1 > 0 && y1 < this.size - 1) {
                this.maze[y1][x] = ELEMENTS.empty;
            }
        }

        for (let y = startY; y <= endY; y++) {
            if (x2 > 0 && x2 < this.size - 1 && y > 0 && y < this.size - 1) {
                this.maze[y][x2] = ELEMENTS.empty;
            }
        }
    }

    addLoops() {
        // Add extra corridors to create loops
        const loopCount = this.complexity === 'hard' ? 3 : 1;

        for (let i = 0; i < loopCount && i < this.rooms.length - 1; i++) {
            const room1 = this.rooms[Math.floor(Math.random() * this.rooms.length)];
            const room2 = this.rooms[Math.floor(Math.random() * this.rooms.length)];

            if (room1 !== room2) {
                this.createCorridor(room1, room2);
            }
        }
    }
}
