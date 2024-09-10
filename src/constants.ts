export enum KarmaEventName {
	Listening = 'listening',
	Exit = 'exit',

	RunStart = 'run_start',
	SpecComplete = 'spec_complete',
	SpecSkipped = 'spec_skipped',
	SpecFailure = 'spec_failure',
	SpecSuccess = 'spec_success',
	RunComplete = 'run_complete',

	BrowserRegister = 'browser_register',
	BrowsersChange = 'browsers_change',
	BrowsersReady = 'browsers_ready',
	BrowserStart = 'browser_start',
	BrowserComplete = 'browser_complete',
	BrowserInfo = 'browser_info',
	BrowserLog = 'browser_log',
	BrowserError = 'browser_error',
	BrowserProcessFailure = 'browser_process_failure',

	FileListModified = 'file_list_modified',
	BrowserCompleteWithNoMoreRetires = 'browser_complete_with_no_more_retries'
}
