module.exports = {
	networks: {
	  development: {
		host: "172.24.96.1",
		port: 7545, // El puerto que está usando Ganache
		network_id: "*", // Cualquier red
	  },
	},
	compilers: {
	  solc: {
		version: "0.8.0",
	  },
	},
  };
  