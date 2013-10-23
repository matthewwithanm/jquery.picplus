module.exports = (grunt) ->

  grunt.initConfig
    pkg: grunt.file.readJSON 'package.json'
    bump:
      options:
        files: ['package.json', 'bower.json']
        commit: true
        commitFiles: ['-a']
        createTag: true
        push: false

  # Load grunt plugins
  grunt.loadNpmTasks 'grunt-bump'

  # Define tasks.
  grunt.registerTask 'version:patch', ['bump:patch']
  grunt.registerTask 'version:minor', ['bump:minor']
  grunt.registerTask 'version:major', ['bump:major']
