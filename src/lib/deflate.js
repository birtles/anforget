define(['deflate/rawinflate', 'deflate/rawdeflate'],
  function (inflate, deflate) {
	'use strict';

	return {
		'inflate': inflate,
		'deflate': deflate
	};
});
