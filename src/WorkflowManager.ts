import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface WorkflowStep {
    id: string;
    name: string;
    status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
    error?: string;
    logs: string[];
    critical: boolean;
}

export type AudioMode = 'disabled' | 'auto' | 'enabled';

export class WorkflowManager {
    private static instance: WorkflowManager;
    private steps: WorkflowStep[] = [];
    private isRunning = false;

    private constructor() {}

    public static getInstance(): WorkflowManager {
        if (!WorkflowManager.instance) {
            WorkflowManager.instance = new WorkflowManager();
        }
        return WorkflowManager.instance;
    }

    private initSteps(audioMode: AudioMode) {
        this.steps = [
            { id: 'cleanup', name: 'Cleanup Old Processes', status: 'pending', logs: [], critical: true },
            { id: 'env', name: 'Environment Setup', status: 'pending', logs: [], critical: true },
        ];

        if (audioMode !== 'disabled') {
            this.steps.push({ id: 'pulse', name: 'PulseAudio Init', status: 'pending', logs: [], critical: false });
            this.steps.push({ id: 'sink', name: 'Audio Sink Creation', status: 'pending', logs: [], critical: false });
        }

        this.steps.push(
            { id: 'xvfb', name: 'Xvfb Display Start', status: 'pending', logs: [], critical: true },
            { id: 'openbox', name: 'Window Manager (Openbox)', status: 'pending', logs: [], critical: true },
            { id: 'vnc', name: 'VNC Server Start', status: 'pending', logs: [], critical: false },
            { id: 'novnc', name: 'noVNC Gateway Start', status: 'pending', logs: [], critical: false },
            { id: 'browser', name: 'Browser (Chrome) Kiosk', status: 'pending', logs: [], critical: true },
            { id: 'ffmpeg', name: 'FFmpeg Stream Start', status: 'pending', logs: [], critical: true },
        );
    }

    public getStatus() {
        return {
            isRunning: this.isRunning,
            steps: this.steps
        };
    }

    private async runCommand(stepId: string, cmd: string): Promise<boolean> {
        const step = this.steps.find(s => s.id === stepId);
        if (!step) return false;

        step.status = 'running';
        step.logs.push(`Executing: ${cmd}`);

        try {
            const { stdout, stderr } = await execAsync(cmd);
            if (stdout) step.logs.push(stdout);
            if (stderr) step.logs.push(`STDERR: ${stderr}`);
            step.status = 'success';
            return true;
        } catch (error: any) {
            // Ignore missing tmux server errors or kill failures
            if (error.message.includes('no server running') || error.message.includes('can\'t find session')) {
                step.status = 'success';
                return true;
            }

            step.logs.push(`Error: ${error.message}`);
            step.error = error.message;
            if (step.critical) {
                step.status = 'failed';
                return false;
            } else {
                step.status = 'skipped';
                return true; // Continue if not critical
            }
        }
    }

    public async startWorkflow(rtmpUrl: string, streamKey: string, browser: string = 'chrome', audioMode: AudioMode = 'disabled') {
        if (this.isRunning) return;
        this.isRunning = true;
        this.initSteps(audioMode);

        const browserCmd = browser === 'chromium' ? 'chromium' : 'google-chrome';
        const bcmd = `${browserCmd} --no-sandbox --disable-gpu --disable-gpu-compositing --disable-accelerated-2d-canvas --disable-software-rasterizer --disable-dev-shm-usage --disable-extensions --disable-background-networking --disable-sync --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows --disable-features=TranslateUI --autoplay-policy=no-user-gesture-required --window-size=1280,720 --kiosk http://127.0.0.1:3000`;
        
        const ffmpegFull = `ffmpeg -thread_queue_size 4096 -use_wallclock_as_timestamps 1 -fflags nobuffer+genpts -f x11grab -draw_mouse 0 -video_size 1280x720 -framerate 8 -i :99.0 -thread_queue_size 4096 -f pulse -i stream.monitor -af aresample=async=1:min_hard_comp=0.100:first_pts=0 -c:v libx264 -preset ultrafast -tune zerolatency -pix_fmt yuv420p -r 8 -g 16 -b:v 450k -maxrate 450k -bufsize 900k -crf 35 -c:a aac -b:a 48k -ar 44100 -threads 1 -f flv "${rtmpUrl}/${streamKey}"`;
        const ffmpegVideoOnly = `ffmpeg -thread_queue_size 4096 -use_wallclock_as_timestamps 1 -fflags nobuffer+genpts -f x11grab -draw_mouse 0 -video_size 1280x720 -framerate 8 -i :99.0 -c:v libx264 -preset ultrafast -tune zerolatency -pix_fmt yuv420p -r 8 -g 16 -b:v 450k -maxrate 450k -bufsize 900k -crf 35 -threads 1 -f flv "${rtmpUrl}/${streamKey}"`;

        const wrapTmux = (session: string, command: string) => {
            return `(tmux has-session -t ${session} 2>/dev/null && tmux kill-session -t ${session} 2>/dev/null || true); tmux new-session -d -s ${session} "${command.replace(/"/g, '\\"')}"`;
        };

        // Step 1: Cleanup
        if (!await this.runCommand('cleanup', 'pkill -f chrome; pkill -f chromium; pkill -f firefox; pkill ffmpeg; pkill Xvfb; pkill openbox; pkill pulseaudio; pkill x11vnc; pkill websockify || true')) {
            this.isRunning = false; return;
        }

        // Step 2: Env
        if (!await this.runCommand('env', 'export DISPLAY=:99; export XDG_RUNTIME_DIR=/tmp/runtime-root; export PULSE_SINK=stream; mkdir -p $XDG_RUNTIME_DIR; chmod 700 $XDG_RUNTIME_DIR')) {
            this.isRunning = false; return;
        }

        // Step 3 & 4: Pulse
        if (audioMode !== 'disabled') {
            await this.runCommand('pulse', 'pulseaudio --start --exit-idle-time=-1 --disallow-exit || echo "Pulse skip"');
            await this.runCommand('sink', 'pactl load-module module-null-sink sink_name=stream || echo "Sink exists or failed"');
        }

        // Step 5: Xvfb
        if (!await this.runCommand('xvfb', `rm -f /tmp/.X99-lock; ${wrapTmux('quiz-xvfb', 'Xvfb :99 -screen 0 1280x720x16 -ac')}`)) {
            this.isRunning = false; return;
        }

        // Step 6: Openbox
        await this.runCommand('openbox', wrapTmux('quiz-openbox', 'openbox'));

        // Step 7: VNC
        await this.runCommand('vnc', wrapTmux('quiz-vnc', 'x11vnc -display :99 -forever -nopw -listen 0.0.0.0 -xkb'));

        // Step 8: noVNC
        await this.runCommand('novnc', wrapTmux('quiz-websockify', 'python3 -m websockify --web=/usr/share/novnc/ 6080 localhost:5900'));

        // Step 9: Browser
        if (!await this.runCommand('browser', wrapTmux('quiz-browser', bcmd))) {
            this.isRunning = false; return;
        }

        // Step 10: FFmpeg
        let hasAudio = false;
        if (audioMode !== 'disabled') {
            try {
                const { stdout } = await execAsync('pactl list short sinks | grep stream');
                if (stdout) hasAudio = true;
            } catch (e) {}
        }

        const finalFfmpegCmd = hasAudio ? ffmpegFull : ffmpegVideoOnly;
        const ffmpegStep = this.steps.find(s => s.id === 'ffmpeg');
        if (ffmpegStep) {
            if (audioMode === 'disabled') ffmpegStep.logs.push("Audio DISABLED by user. Using VIDEO-ONLY mode.");
            else ffmpegStep.logs.push(hasAudio ? "Audio sink detected, using FULL mode." : "Audio sink missing, fallback to VIDEO-ONLY.");
        }
        
        await this.runCommand('ffmpeg', wrapTmux('quiz-ffmpeg', finalFfmpegCmd));

        this.isRunning = false;
    }
}
