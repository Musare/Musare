# MusareNode
Musare in NodeJS, Express, SocketIO and VueJS.

## Requirements
 * [Virtualbox](https://www.virtualbox.org/)
 * [Vagrant](https://www.vagrantup.com/)

##### Important Notes
The latest version of Vagrant (1.8.5) has some issues with inserting ssh keys into the machine. It's a show stopping bug that they aren't going to fix until the [next release](https://github.com/mitchellh/vagrant/issues/7610#issuecomment-234609660). So for now, I recommend using [Vagrant 1.8.4](https://releases.hashicorp.com/vagrant/1.8.4/). You'll also need to use a slightly [older version of Virtualbox](https://www.virtualbox.org/wiki/Download_Old_Builds_5_0) because of this.

## Getting Started
Once you've installed the required tools:

1. `git clone https://github.com/MusareNode/MusareNode.git`
2. `cd MusareNode`
3. `cp backend/config/template.json backend/config/default.json`

  > The `secret` key can be whatever. It's used by express's session module. The `apis.youtube.key` value can be obtained by setting up a [YouTube API Key](https://developers.google.com/youtube/v3/getting-started).

4. `vagrant up`
5. `vagrant reload`

This will ensure that the services we've created start up correctly.

Once this is done you should be able to access Musare in your local browser at [172.16.1.2](http://172.16.1.2). To access the RethinkDB admin panel, go to [172.16.1.2:8080](http://172.16.1.2:8080) in your local web browser.

You can also now access your machine using:

`vagrant ssh`

Or if you have [mosh](https://mosh.org/) installed (and have ran `vagrant plugin install vagrant-mosh`), you can run:

`vagrant mosh`

You can run `vagrant` to view more options.

### Production Logs

You can view logs at the following locations:

* Musare: `/var/log/upstart/musare.log`
* mongoDB: `/var/log/upstart/mongodb.log`

### Development

`sudo service musare start`

### FAQ

##### What does `vagrant up` do?
This will pull down the Ubuntu 14.04 vagrant box and setup a virtualbox machine for you. It'll ask you what network interface you want the virtualbox machine to connect to the internet with. On macOS I typically choose `en0: Wi-Fi (AirPort)`, but it'll be different on different platforms. It will then run the commands in the `bootstrap.sh` file on this virtual machine. This will install nodejs, rethinkdb, and a bunch of other goodies. This same file could be ran on a production Ubuntu 14.04 server with very little modifications (if any at all).

##### What does `vagrant ssh` and `vagrant mosh` do?
Vagrant automagically generates and inserts a openssh keypair for you. This doesn't really have any security (as it doesn't really need to be since it's only for development). This allows you to access your machine in a very convenient way. The second command, `vagrant mosh`, is actually just a vagrant plugin. Mosh is a replacement for SSH, and if you haven't checked it out before, you really should! :)

##### Why use Vagrant? I can run NodeJS and mongoDB locally
The reason for using vagrant is simple. It gives every developer the same local development server. This removes any inconsistencies across different dev enviroments (Windows vs macOS vs Linux). It also ensures that your changes are running on an environment that exactly matches the production server.
