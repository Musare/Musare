# -*- mode: ruby -*-
# vi: set ft=ruby :

HOST_SSH_PORT = 2260

Vagrant.configure(2) do |config|

	config.vm.box = "ubuntu/trusty64"

	config.vm.network "public_network"

	config.vm.network "private_network", :ip => '172.16.1.2'

	config.vm.network :forwarded_port, guest: 22, host: 2222, id: "ssh", disabled: true
	config.vm.network :forwarded_port, guest: 22, host: HOST_SSH_PORT, auto_correct: true

	config.ssh.port = HOST_SSH_PORT
	config.ssh.guest_port = 22

	config.vm.synced_folder '.', '/vagrant', disabled: true
	config.vm.synced_folder ".", "/musare"

	config.vm.provision "shell", path: "bootstrap.sh"

end

