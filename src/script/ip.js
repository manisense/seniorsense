// First, we'll need to get the network interfaces
const os = require('os');
const interfaces = os.networkInterfaces();

// Function to get all MAC addresses
function getMacAddresses() {
    const macAddresses = [];
    
    for (const interfaceName in interfaces) {
        const networkInterface = interfaces[interfaceName];
        
        for (const interface of networkInterface) {
            // We're only interested in IPv4 addresses
            if (interface.family === 'IPv4' && !interface.internal) {
                macAddresses.push({
                    interface: interfaceName,
                    address: interface.address,
                    mac: interface.mac
                });
            }
        }
    }
    
    return macAddresses;
}

// Function to check if the Expo address matches any network interface
function checkExpoAddress(expoAddress) {
    const macAddresses = getMacAddresses();
    const expoIp = expoAddress.split(':')[0]; // Remove port number if present
    
    console.log('Available network interfaces:');
    macAddresses.forEach(interface => {
        console.log(`Interface: ${interface.interface}`);
        console.log(`IP Address: ${interface.address}`);
        console.log(`MAC Address: ${interface.mac}`);
        console.log('---');
        
        if (interface.address === expoIp) {
            console.log(`✅ Match found! Expo is using the correct network interface`);
        }
    });
    
    console.log(`\nExpo development server address: ${expoAddress}`);
    
    const matchingInterface = macAddresses.find(interface => interface.address === expoIp);
    if (!matchingInterface) {
        console.log('❌ Warning: Expo address does not match any available network interface');
        console.log('This might cause connection issues with Expo Go');
    }
}

// Example usage:
// Replace this with your actual Expo development server address
const expoAddress = '11.4.0.101:8081';
checkExpoAddress(expoAddress);

// To fix the issue if addresses don't match:
console.log('\nTo fix connection issues:');
console.log('1. Check your Expo development server address in the Metro bundler');
console.log('2. Make sure your mobile device is on the same network as your development machine');
console.log('3. Try setting the REACT_NATIVE_PACKAGER_HOSTNAME environment variable to match your development machine\'s IP address');
console.log('4. If using a VM or network proxy, ensure proper network bridging is configured');