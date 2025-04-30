import { Component, inject, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from './services/auth.service';
import { GService } from './services/g.service';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { filter } from 'rxjs/operators';
import { UserService } from './services/user.service';
import { AnnouncementsService } from './services/announcements.service';
import { UserSettingService } from './services/user-setting.service';
import { NewFeatureDialogComponent } from './parts/new-feature-dialog/new-feature-dialog.component';

declare var _paq: any;

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'Hapteec UI';
  isChecked = false;
  showInfo = true;
  readonly authService: AuthService = inject(AuthService);
  readonly userService: UserService = inject(UserService);
  readonly translateService: TranslateService = inject(TranslateService);
  readonly g: GService = inject(GService);
  readonly router: Router = inject(Router);
  readonly announcementsService: AnnouncementsService = inject(AnnouncementsService);
  readonly userSettingService: UserSettingService = inject(UserSettingService);
  readonly dialog: MatDialog = inject(MatDialog);

  private readonly swUpdate: SwUpdate = inject(SwUpdate);
  private readonly snackBar: MatSnackBar = inject(MatSnackBar);

  constructor() {
    // v1.0からv2.0への移行
    const v1 = localStorage.getItem('settings-v1.0');
    if (v1 && JSON.parse(v1).model) {
      // localStorage.removeItem('settings-v1.0');
      localStorage.setItem('settings-v2.0', JSON.stringify([JSON.parse(v1)]));
    } else { }
  }

  ngOnInit(): void {
    this.initializeApp();
    this.setupPwaUpdateCheck();

    // matomo
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        _paq.push(['setCustomUrl', event.urlAfterRedirects]);
        _paq.push(['trackPageView']);
      }
    });
  }

  private initializeApp(): void {
    this.translateService.setDefaultLang('ja');
    this.g.autoRedirectToLoginPageIfAuthError = false;
    this.authService.getUser().subscribe({
      next: next => {
        /* matomoにUserIDを送る */
        _paq.push(['setUserId', next.id]);

        this.g.info.user = next;
        this.g.autoRedirectToLoginPageIfAuthError = true;
        this.userService.getUserSetting().subscribe({
          next: next => {
            this.isChecked = true;
            this.checkForUnreadAnnouncements();
          },
          error: error => {
            this.isChecked = true;
          },
          complete: () => {
            // console.log('complete');
          }
        });
      },
      error: error => {
        this.g.autoRedirectToLoginPageIfAuthError = true;
        this.isChecked = true;
      },
      complete: () => {
        // console.log('complete');
      }
    });
  }

  private checkForUnreadAnnouncements(): void {
    this.userSettingService.getUnreadAnnouncements().subscribe(
      unreadIds => {
        if (unreadIds.length > 0) {
          this.showNewFeatureDialog();
        }
      },
      error => {
        console.error('Failed to check unread announcements:', error);
      }
    );
  }

  private showNewFeatureDialog(): void {
    this.dialog.open(NewFeatureDialogComponent, {
      width: '600px',
      disableClose: true
    });
  }

  isUpdated = false;
  reload(): void {
    window.location.reload();
  }

  private setupPwaUpdateCheck(): void {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
        .subscribe(evt => {
          const snack = this.snackBar.open('更新が利用可能です', '更新', {
            duration: 6000,
          });
          this.isUpdated = true;
          snack.onAction().subscribe(() => {
            this.reload();
          });
        });

      // 1時間ごとに更新をチェック
      setInterval(() => {
        this.swUpdate.checkForUpdate();
      }, 1 * 60 * 60 * 1000);
    } else {
    }
  }
}
