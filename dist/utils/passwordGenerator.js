"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRandomPassword = void 0;
/**
 * Generates a random password with specified length and complexity
 * @param length Password length (default: 10)
 * @returns Random password
 */
const generateRandomPassword = (length = 10) => {
    const upperChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // removed I and O for clarity
    const lowerChars = 'abcdefghijkmnopqrstuvwxyz'; // removed l for clarity
    const numbers = '23456789'; // removed 0 and 1 for clarity
    const specialChars = '!@#$%^&*_-+=';
    // Ensure at least one character from each category
    let password = '';
    password += upperChars.charAt(Math.floor(Math.random() * upperChars.length));
    password += lowerChars.charAt(Math.floor(Math.random() * lowerChars.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
    // Generate the rest of the password
    const allChars = upperChars + lowerChars + numbers + specialChars;
    for (let i = 4; i < length; i++) {
        password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    // Shuffle the password
    return password
        .split('')
        .sort(() => 0.5 - Math.random())
        .join('');
};
exports.generateRandomPassword = generateRandomPassword;
