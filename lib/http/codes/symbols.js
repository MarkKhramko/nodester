/*!
 * /nodester
 * MIT Licensed
 */
'use strict';

const Enum = require('nodester/enum');


module.exports = new Enum({
	// Informational:
	CONTINUE: Symbol('100: Continue'),
	SWITCHING_PROTOCOLS: Symbol('101: Switching Protocols'),
	PROCESSING: Symbol('102: Processing'),
	EARLY_HINTS: Symbol('103: Early Hints'),

	// Success:
	OK: Symbol('200: OK'),
	CREATED: Symbol('201: Created'),
	ACCEPTED: Symbol('202: Accepted'),
	NON_AUTHORITATIVE_INFORMATION: Symbol('203: Non-Authoritative Information'),
	NO_CONTENT: Symbol('204: No Content'),
	RESET_CONTENT: Symbol('205: Reset Content'),
	PARTIAL_CONTENT: Symbol('206: Partial Content'),
	MULTI_STATUS: Symbol('207: Multi-Status'),
	ALREADY_REPORTED: Symbol('208: Already Reported'),
	IM_USED: Symbol('226: IM Used'),

	// Redirections:
	MULTIPLE_CHOICES: Symbol('300: Multiple Choices'),
	MOVED_PERMANENTLY: Symbol('301: Moved Permanently'),
	FOUND: Symbol('302: Found'),
	SEE_OTHER: Symbol('303: See Other'),
	NOT_MODIFIED: Symbol('304: Not Modified'),
	USE_PROXY: Symbol('305: Use Proxy'),
	TEMPORARY_REDIRECT: Symbol('307: Temporary Redirect'),
	PERMANENT_REDIRECT: Symbol('308: Permanent Redirect'),

	// Client Errors:
	BAD_REQUEST: Symbol('400: Bad Request'),
	UNAUTHORIZED: Symbol('401: Unauthorized'),
	PAYMENT_REQUIRED: Symbol('402: Payment Required'),
	FORBIDDEN: Symbol('403: Forbidden'),
	NOT_FOUND: Symbol('404: Not Found'),
	METHOD_NOT_ALLOWED: Symbol('405: Method Not Allowed'),
	NOT_ACCEPTABLE: Symbol('406: Not Acceptable'),
	PROXY_AUTHENTICATION_REQUIRED: Symbol('407: Proxy Authentication Required'),
	REQUEST_TIMEOUT: Symbol('408: Request Timeout'),
	CONFLICT: Symbol('409: Conflict'),
	GONE: Symbol('410: Gone'),
	LENGTH_REQUIRED: Symbol('411: Length Required'),
	PRECONDITION_FAILED: Symbol('412: Precondition Failed'),
	PAYLOAD_TOO_LARGE: Symbol('413: Payload Too Large'),
	URI_TOO_LONG: Symbol('414: URI Too Long'),
	UNSUPPORTED_MEDIA_TYPE: Symbol('415: Unsupported Media Type'),
	RANGE_NOT_SATISFIABLE: Symbol('416: Range Not Satisfiable'),
	EXPECTATION_FAILED: Symbol('417: Expectation Failed'),
	IM_A_TEAPOT: Symbol("418: I'm a teapot"),
	MISDIRECTED_REQUEST: Symbol('421: Misdirected Request'),
	UNPROCESSABLE_ENTITY: Symbol('422: Unprocessable Entity'),
	LOCKED: Symbol('423: Locked'),
	FAILED_DEPENDENCY: Symbol('424: Failed Dependency'),
	TOO_EARLY: Symbol('425: Too Early'),
	UPGRADE_REQUIRED: Symbol('426: Upgrade Required'),
	PRECONDITION_REQUIRED: Symbol('428: Precondition Required'),
	TOO_MANY_REQUESTS: Symbol('429: Too Many Requests'),
	REQUEST_HEADER_FIELDS_TOO_LARGE: Symbol('431: Request Header Fields Too Large'),
	UNAVAILABLE_FOR_LEGAL_REASONS: Symbol('451: Unavailable For Legal Reasons'),

	// Server Errors:
	INTERNAL_SERVER_ERROR: Symbol('500: Internal Server Error'),
	NOT_IMPLEMENTED: Symbol('501: Not Implemented'),
	BAD_GATEWAY: Symbol('502: Bad Gateway'),
	SERVICE_UNAVAILABLE: Symbol('503: Service Unavailable'),
	GATEWAY_TIMEOUT: Symbol('504: Gateway Timeout'),
	HTTP_VERSION_NOT_SUPPORTED: Symbol('505: HTTP Version Not Supported'),
	VARIANT_ALSO_NEGOTIATES: Symbol('506: Variant Also Negotiates'),
	INSUFFICIENT_STORAGE: Symbol('507: Insufficient Storage'),
	LOOP_DETECTED: Symbol('508: Loop Detected'),
	NOT_EXTENDED: Symbol('510: Not Extended'),
	NETWORK_AUTHENTICATION_REQUIRED: Symbol('511: Network Authentication Required')
});
