# SQL for Nodebug.me

All of the runtime queries that Nodebug.me uses can be found in this directory.
The directory is loaded using [querybox](http://npm.im/querybox), and made available
on the request object as `request.querybox`. The initialization SQL can be found
[over here](../migrations/).
